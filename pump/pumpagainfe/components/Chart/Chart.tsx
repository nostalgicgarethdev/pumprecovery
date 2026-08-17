import { Coin } from "@/hooks/useCoins";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import styles from "./Chart.module.css";
import { useSocket } from "@/providers/SocketProvider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import BN from "bn.js";
import { useCandlesticks } from "@/hooks/useCandlesticks";
import { features } from "process";
interface Candlestick {
  timestamp: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

interface ChartProps {
  height?: number;
  widthScale: number;
  symbol: string;
  coin: Coin;
}

const Chart: React.FC<ChartProps> = ({

  height = 500,
  widthScale = 1,
  symbol,
  coin
}) => {
  const [timeframe, setTimeframe] = useState('5');
  const { candlesticks, loading } = useCandlesticks(coin.mint, timeframe);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTVScriptLoaded, setTVScriptLoaded] = useState(false);
  const [showPumpChart, setShowPumpChart] = useState(true);
  const [shouldShake, setShouldShake] = useState(false);
  const [oldCandle, setOldCandle] = useState<Candlestick | null>(null);
  useEffect(() => {
    const scriptId = "tradingview-widget-script";
    const scriptAlreadyLoaded = document.getElementById(scriptId);
    if (!scriptAlreadyLoaded) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "/tradingview/charting_library/charting_library.standalone.js";
      script.async = true;
      script.onload = () => setTVScriptLoaded(true);
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    } else {
      setTVScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    setShowPumpChart(!Boolean(coin.raydium_pool));
  }, [coin]);
  const socket = useSocket();
  /*fn lamports_per_token(remaining_percentage: f64) -> f64 {
    let a: f64 = 13169.68; // Estimated parameter 'a' of the power law curve
    let b: f64 = 1.705;    // Estimated parameter 'b' of the power law curve
    let lamports_per_sol: f64 = 1_000_000_000.0; // 1 SOL = 1,000,000,000 lamports

    // Calculate tokens per SOL using the bonding curve
    // should this be decimal or percentage?
    let tokens_per_sol = a * remaining_percentage.powf(b);

    // Invert the relationship to get lamports per token
    lamports_per_sol / tokens_per_sol
}
*/
function isNewCandle(trade: any) {

  if (oldCandle == null){
    return true;
  }
  let seconds = 1;
  if (timeframe == '5'){
    seconds = 5 * 60;
  }
  if (timeframe == '15'){
    seconds = 15 * 60;
  }
  if (trade.timestamp * 1000 < oldCandle.timestamp * 1000 + seconds){
    return false;
  }
  return true;
}
function createNewCandle(trade: any) {
  const newPrice = (trade.virtual_sol_reserves / LAMPORTS_PER_SOL)/ humanizeTokenAmount(trade.virtual_token_reserves);

  return {
    timestamp: trade.timestamp * 1000,
    time: trade.timestamp * 1000,
    open: lastCandle ? lastCandle.close : newPrice,
    high: newPrice,
    low: newPrice,
    close: newPrice,
    volume: trade.sol_amount / LAMPORTS_PER_SOL
  };
}
function updateExistingCandle(trade: any, candle: any) {
  const newPrice = (trade.virtual_sol_reserves / LAMPORTS_PER_SOL)/ humanizeTokenAmount(trade.virtual_token_reserves);

  return {
    ...candle,
    high: candle.high < newPrice ? newPrice : candle.high,
    low: candle.low > newPrice ? newPrice : candle.low,
    close: newPrice,
    volume: candle.volume + trade.sol_amount / LAMPORTS_PER_SOL,
    time: trade.timestamp * 1000,
    timestamp: trade.timestamp * 1000,
  };
}
let lastCandle: Candlestick | null = null;

  const formatTradeToCandle = (trade: any) => {
    // Example trade object: { price: 100, volume: 5, timestamp: 1609459200000 }
    // For simplicity, this example assumes the trade's price applies to all OHLC values

    if (isNewCandle(trade)) {
      lastCandle = createNewCandle(trade);
    } else {
      lastCandle = updateExistingCandle(trade, lastCandle);
    }
    return lastCandle
  };
  const [latestTrade, setLatestTrade] = useState(null);
  const [chart, setChart] = useState<any>(null);
  useEffect(() => {
    if (isTVScriptLoaded && chartContainerRef.current) {
      const TradingView = window.TradingView;

      if (!socket) return;
      const widgetOptions = {
        debug: true,
        symbol: symbol,
        has_seconds: true,
        has_intraday: true,
        enabled_features: ["seconds_resolution"],
        time_frames: [
          { text: "1s", resolution: "1S", description: "1 Seconds" },
          { text: "5m", resolution: "5", description: "5 Minutes" },
          { text: "15m", resolution: "15", description: "15 Minutes" }
        ],        
        favorites: {
          intervals: ["1S", "5", "15"],
        },
        interval: "1S",
        supported_resolutions: ["1S", "5", "15"],
        
        container: chartContainerRef.current.id,
        datafeed: {
          onReady: (cb: (data: any) => void) => {
            setTimeout(() => cb({}), 0);
          },
          searchSymbols: async (
            userInput: string,
            exchange: string,
            symbolType: string,
            onResultReadyCallback: (data: any) => void
          ) => {},
          resolveSymbol: async (
            symbolName: string,
            onSymbolResolvedCallback: (data: any) => void,
            onResolveErrorCallback: (error: any) => void
          ) => {
            const symbolInfo = {
              name: symbolName,
              ticker: symbolName,
              description: `${symbolName}`,
              type: "crypto",
              session: "24x7",
              timezone: "Etc/UTC",
              exchange: "Pump",
              has_intraday: true,
              minmov: 1,
              enabled_features: ["seconds_resolution"],
              pricescale: 10000000000,
              has_seconds: true,
              supported_resolutions: ["1S", "5", "15"],
              data_status: 'streaming',
            };

            onSymbolResolvedCallback(symbolInfo);
          },
          getBars: (
            symbolInfo: any,
            resolution: any,
            periodParams: {
              from: number;
              to: number;  
              firstDataRequest: boolean;
            },
            onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
            onErrorCallback: (error: string) => void
          ) => {
            setTimeframe(resolution);
            const filteredBars = candlesticks
              .filter((candlestick) => {
                const candleTime = candlestick.timestamp * 1000;
                return (
                  candleTime >= periodParams.from * 1000 &&
                  candleTime <= periodParams.to * 1000
                );
              })
              .map((candlestick) => ({
                time: candlestick.timestamp * 1000,
                low: candlestick.low,
                high: candlestick.high,
                open: candlestick.open,
                close: candlestick.close,
                volume: candlestick.volume,
              }));

            if (filteredBars.length || candlesticks) {
              onHistoryCallback(filteredBars, { noData: false });
            } else {
              onHistoryCallback([], { noData: true });
            }
          },
          subscribeBars: (
            symbolInfo: any,
            resolution: any,
            onRealtimeCallback: any,
            subscriberUID: any,
            onResetCacheNeededCallback: any
          ) => {
            
              const handleTradeCreated = (newTrade: any) => {
                setLatestTrade(newTrade);
                // Assuming you have access to the `onRealtimeCallback` function here,
                // you can format the newTrade into the candle format expected by ChartingView
                // and then call `onRealtimeCallback` to update the chart.
                const oldCandle = candlesticks[candlesticks.length - 1];
                setOldCandle(oldCandle)
                console.log(oldCandle)
                if (oldCandle != undefined){
                  const newCandle = formatTradeToCandle(newTrade);
                  let i = 0;
                  const interval = setInterval(() => {
                    const newCandle = formatTradeToCandle(newTrade);
                    if (newCandle == null) return;
                    const upOrDown = newCandle.close > oldCandle.close ? "arrow_up" : "arrow_down";
                  chart.chart().createShape(
                      { channel: upOrDown == 'arrow_up' ? 'low' : 'high', time: newCandle ? newCandle.timestamp : 0 },
                      {
                          shape: upOrDown,
                          overrides: { "arrowColor": "yellow" },
                      }
                  );  

                    setTimeout(() => {
                     // remove shape
                     chart.chart().removeAllShapes()
                     
                    }, 50);
                    i++
                    if (i == 5){
                      clearInterval(interval)
                    }
                  }, 100);
                  onRealtimeCallback(newCandle);
                }
              };
            
              socket.on(`tradeCreated:${coin.mint}`, handleTradeCreated);
            
              return () => {
                socket.off(`tradeCreated:${coin.mint}`, handleTradeCreated);
              };

            
          },
          unsubscribeBars: (subscriberUID: string) => {},
        },
        library_path: "/tradingview/charting_library/",
        locale: "en" as any,
        autosize: true,
        theme: "dark" as any,
        overrides: {
          "paneProperties.background": "#1b1d28",
          "paneProperties.backgroundType": "solid",
          "mainSeriesProperties.showPriceLine": true,
          "scalesProperties.lineColor": "#555",
          "scalesProperties.textColor": "#AAA",
          // Ensure the price scale is on the right
          "paneProperties.vertGridProperties.color": "#454545",
          "paneProperties.horzGridProperties.color": "#454545",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.showLeftScale": false, // Disable left scale
          "scalesProperties.showRightScale": true, // Enable right scale
        },
      };

      const widgetOptionsAny: any = widgetOptions;
      const chart = new TradingView.widget(widgetOptionsAny);
      return () => {
        chart.remove();
      };
    }
  }, [isTVScriptLoaded, candlesticks, height, widthScale]);

  return (
    <div className="grid h-fit gap-2">
      {coin.raydium_pool && (
        <div className="flex gap-1 h-fit items-center text-white">
          <div
            onClick={() => setShowPumpChart(true)}
            className={clsx(
              "cursor-pointer px-1 rounded",
              showPumpChart && "bg-green-300 text-black",
              !showPumpChart && "hover:bg-gray-800 text-gray-500"
            )}
          >
            Pump chart
          </div>
          <div
            onClick={() => setShowPumpChart(false)}
            className={clsx(
              "cursor-pointer px-1 rounded",
              !showPumpChart && "bg-green-300 text-black",
              showPumpChart && "hover:bg-gray-800 text-gray-500"
            )}
          >
            Current chart
          </div>
        </div>
      )}
    <div className={`chart-container ${shouldShake ? 'animate-shake' : ''}`}>

      <div
        id={`tv-chart-${Math.random()
          .toString(36)
          .substring(2, 15)}`}
        ref={chartContainerRef}
        className={clsx(!showPumpChart && "hidden")}
        style={{ height: `${height}px`, width: `${widthScale * 100}%` }}
      />

      <div className={clsx(styles.dexscreenerEmbed, showPumpChart && "hidden")}>
        <div id="dexscreener-embed">
          <iframe
            style={{ height: `${height}px`, width: `${widthScale * 100}%` }}
            src={`https://dexscreener.com/solana/${coin.raydium_pool}?embed=1&theme=dark&trades=0&info=0`}
          ></iframe>
        </div>
      </div>

      {/* <iframe
        className={clsx(showPumpChart && "hidden")}
        width={`${widthScale * 100}%`}
        height={height}
        src={`https://birdeye.so/tv-widget/${coin.mint}?chain=solana&chartType=candle&chartInterval=5&chartLeftToolbar=show`}
        allowFullScreen
      ></iframe> */}
    </div>
    </div>
  );
};

export default Chart;
