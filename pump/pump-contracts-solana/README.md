# Pump solana contracts

Pump is a new way to launch SPL coins that are instantly tradeable on a bonding curve without having to seed liquidity. When the coin hits a certain market cap the liquidity from the bonding curve is withdrawn and deposited into Raydium (an AMM on solana). The LP tokens received from the Raydium pool are then burnt.

The bonding curve formula is based on Uniswap V2 and uses synthetic x and y reserves to ensure that there is liquidity for the coin. If you would like to test the app out there exists a deployment on Blast Sepolia here: https://devnet.pump.fun/

# Testing

You will first need to paste a path to your keypair file in Anchor.toml file under `wallet = ""`.

Then run:

```
anchor test
```


