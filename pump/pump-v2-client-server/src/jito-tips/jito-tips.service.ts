import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

const DEFAULT_TIP = 100_000;

@Injectable()
export class JitoTipsService {
  tip: number = DEFAULT_TIP; // lamports
  historicalTips: number[] = [];

  constructor() {
    // this.startListener();
  }

  //   async startListener() {
  //     const tips = await fetch(
  //       'http://bundles-api-rest.jito.wtf/api/v1/bundles/tip_floor',
  //     ).then((r) => r.json());

  //     // fetch the median tip
  //     this.historicalTips = tips.map((tip) => tip.tip_floor);
  //   }
}
