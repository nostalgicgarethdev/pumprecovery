import { BN } from '@coral-xyz/anchor';

export const humanizeTokenAmount = (amount: number | BN) => {
  if (typeof amount === 'number') return amount / 10 ** 6;
  return amount.div(new BN(10 ** 6)).toNumber();
};
