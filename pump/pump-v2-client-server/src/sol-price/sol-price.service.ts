import { Injectable } from '@nestjs/common';

@Injectable()
export class SolPriceService {
  price = 0;

  constructor() {
    this.updateSolPrice();

    setInterval(
      () => {
        this.updateSolPrice();
      },
      15 * 60 * 1000,
    );
  }

  getPrice() {
    return { solPrice: this.price };
  }

  async updateSolPrice() {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    ).then((r) => r.json());

    try {
      this.price = res.solana.usd;
    } catch (e) {
      if (!this.price) this.price = 100;
      console.error('could not fetch sol price', e);
    }
  }
}
