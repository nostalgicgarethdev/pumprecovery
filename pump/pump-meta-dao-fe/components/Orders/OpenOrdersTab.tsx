import { useCallback, useState } from 'react';
import { Stack, Table, Button, Group, Text } from '@mantine/core';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { OpenOrdersAccountWithKey } from '@/lib/types';
import { useTransactionSender } from '@/hooks/useTransactionSender';
import { isPartiallyFilled } from '@/lib/openbook';
import { OpenOrderRow } from './OpenOrderRow';
import { useOpenbookMarket } from '@/contexts/OpenbookMarketContext';
import { useOpenbook } from '@/hooks/useOpenbook';

const headers = ['Order ID', 'Market', 'Status', 'Size', 'Price', 'Notional', 'Actions'];

export function OpenOrdersTab({ orders }: { orders: OpenOrdersAccountWithKey[] }) {
  const sender = useTransactionSender();
  const wallet = useWallet();
  const { market, marketPubkey, fetchOpenOrders } = useOpenbookMarket();
  const { cancelOrderTransactions, settleFundsTransactions } = useOpenbook();

  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  const [isSettling, setIsSettling] = useState<boolean>(false);

  const handleCancelAll = useCallback(async () => {
    if (!market || !marketPubkey) return;

    const txs = (
      await Promise.all(
        orders.map((order) =>
          cancelOrderTransactions(
            new BN(order.account.accountNum),
            { publicKey: marketPubkey, account: market.market }
          ),
        ),
      )
    ).flat();

    if (!wallet.publicKey || !txs) return;

    try {
      setIsCanceling(true);
      // Filtered undefined already
      await sender.send(txs);
      // We already return above if the wallet doesn't have a public key
      await fetchOpenOrders(wallet.publicKey!);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCanceling(false);
    }
  }, [market, marketPubkey, wallet.publicKey, cancelOrderTransactions, fetchOpenOrders, sender]);

  const handleSettleAllFunds = useCallback(async () => {
    if (!market || !marketPubkey) return;

    setIsSettling(true);
    try {
      const txs = (
        await Promise.all(
          orders
            .filter((order) => isPartiallyFilled(order))
            .map((order) =>
              settleFundsTransactions(
                order.account.accountNum,
                { publicKey: marketPubkey, account: market.market }
              ),
            ),
        )
      )
        .flat()
        .filter(Boolean);

      if (!txs) return;
      sender.send(txs as Transaction[]);
    } finally {
      setIsSettling(false);
    }
  }, [orders, market, marketPubkey, settleFundsTransactions]);

  return (
    <Stack py="md">
      <Text size="sm">
        If you see orders here with a settle button, you can settle them to redeem the partial fill
        amount. These exist when there is a balance available within the Open Orders Account.
      </Text>
      <Group justify="space-around">
        <Button loading={isCanceling} onClick={handleCancelAll}>
          Cancel all orders
        </Button>
        <Button
          loading={isSettling}
          color="blue"
          onClick={handleSettleAllFunds}
          disabled={!orders.filter((order) => isPartiallyFilled(order)).length}
        >
          Settle {orders.filter((order) => isPartiallyFilled(order)).length} orders
        </Button>
      </Group>
      {orders && orders.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              {headers.map((header) => (
                <Table.Th key={header}>{header}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orders.map((order) => (
              <OpenOrderRow key={order.publicKey.toString()} order={order} />
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text py="sm">No Orders Found</Text>
      )}
    </Stack>
  );
}
