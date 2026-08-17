import { Coin } from "@/hooks/useCoins";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import styles from "./Chart.module.css";
import { useSocket } from "@/providers/SocketProvider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { humanizeTokenAmount } from "@/utils/humanizeTokenAmount";
import { getBrand } from "@/lib/brand";
import BN from "bn.js";
interface Candlestick {
  timestamp: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

interface ChartProps {
  candlesticks: Candlestick[];
  height?: number;
  widthScale: number;
  symbol: string;
  coin: Coin;
  solPrice?: number;
}

const TOTAL_SUPPLY = 1_000_000_000; // pump-style fixed supply (token count)

const Chart: React.FC<ChartProps> = ({
  candlesticks,
  height = 500,
  widthScale = 1,
  symbol,
  coin,
  solPrice = 0,
}) => {
  const [timeframe, setTimeframe] = useState("5");
  // Default to USD market cap (mcap = price/token * total supply * SOL price).
  const [priceMode, setPriceMode] = useState<"mcap" | "price">("mcap");
  const [chartSolPrice, setChartSolPrice] = useState(0);
  useEffect(() => {
    // Capture SOL price once so the chart doesn't re-init on every price tick.
    if (solPrice && !chartSolPrice) setChartSolPrice(solPrice);
  }, [solPrice, chartSolPrice]);
  const valueMultiplier =
    priceMode === "mcap" && chartSolPrice ? TOTAL_SUPPLY * chartSolPrice : 1;

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
  function isNewCandle(trade: any) {
    if (oldCandle == null) {
      return true;
    }
    let seconds = 1;
    if (timeframe == "300S") {
      seconds = 5 * 60;
    }
    if (timeframe == "900S") {
      seconds = 15 * 60;
    }
    if (trade.timestamp * 1000 < oldCandle.timestamp * 1000 + seconds) {
      return false;
    }
    return true;
  }
  function createNewCandle(trade: any) {
    const newPrice =
      trade.virtual_sol_reserves /
      LAMPORTS_PER_SOL /
      humanizeTokenAmount(trade.virtual_token_reserves);

    return {
      timestamp: trade.timestamp * 1000,
      time: trade.timestamp * 1000,
      open: lastCandle ? lastCandle.close : newPrice,
      high: newPrice,
      low: newPrice,
      close: newPrice,
      volume: trade.sol_amount / LAMPORTS_PER_SOL,
    };
  }
  function updateExistingCandle(trade: any, candle: any) {
    const newPrice =
      trade.virtual_sol_reserves /
      LAMPORTS_PER_SOL /
      humanizeTokenAmount(trade.virtual_token_reserves);

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
    return lastCandle;
  };
  const [latestTrade, setLatestTrade] = useState(null);
  const [chart, setChart] = useState<any>(null);
  useEffect(() => {
    if (isTVScriptLoaded && chartContainerRef.current) {
      const TradingView = window.TradingView;

      if (!socket) return;
      const widgetOptions: any = {
        debug: true,
        symbol: symbol,
        has_intraday: true,
        enabled_features: ["seconds_resolution"],
        time_frames: [
          {
            text: "use legend for 1s",
            resolution: "1S",
            description: "1 Second",
          },
          { text: "5m", resolution: "5", description: "5 Minutes" },
          { text: "15m", resolution: "15", description: "15 Minutes" },
        ],
        interval: "5" as any,
        favorites: {
          intervals: ["1S", "5", "15"],
        },
        has_seconds: true,
        seconds_multipliers: ["1"],
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
              enabled_features: ["seconds_resolution"],
              description: `${symbolName}`,
              type: "crypto",
              session: "24x7",
              timezone: "Etc/UTC",
              exchange: getBrand(),
              has_seconds: true,
              seconds_multipliers: ["1"],
              minmov: 1,
              has_intraday: true,
              supported_resolutions: ["1S", "5", "15"],
              // Tie precision to the actual value magnitude: mcap (multiplier > 1)
              // shows 2 decimals; raw SOL price needs ~10 decimals. Keying off
              // priceMode alone breaks when solPrice hasn't loaded yet (multiplier
              // is still 1 → raw prices rendered at 2 decimals → flat 0.00).
              pricescale: valueMultiplier > 1 ? 100 : 10000000000,
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
            (async () => {
              let tf: number;
              // Adjust resolution handling to match "1S", "5", and "15"
              switch (resolution) {
                case "1S":
                  tf = 1; // 1 second
                  break;
                case "5":
                  tf = 5 * 60; // 5 minutes in seconds
                  break;
                case "15":
                  tf = 15 * 60; // 15 minutes in seconds
                  break;
                default:
                  tf = Number(resolution) || 1;
              }

              const apiUrl = `${
                process.env.NEXT_PUBLIC_CLIENT_API_URL
              }/candlesticks/${coin.mint}/${tf.toString()}`;

              let data: any[] = [];
              try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }
                const json = await response.json();
                data = Array.isArray(json) ? json : [];
              } catch (error) {
                console.error("Failed to fetch candlesticks:", error);
                onErrorCallback("Failed to fetch candlesticks");
                return;
              }

              // Return the FULL available history for this resolution on the
              // first request (sorted ascending, de-duped). Filtering to
              // [from,to] made 1S paint almost nothing — TradingView's initial
              // 1S window is only minutes wide, so the sparse 1S candles (one
              // per trade-second) mostly fell outside it, while 5m's wide window
              // caught everything. With the full set loaded, 1S shows the most
              // bars (finest granularity) and the user can zoom freely.
              const sorted = data
                .filter(
                  (c: any) => c && typeof c.timestamp === "number"
                )
                .map((c: any) => ({
                  time: c.timestamp * 1000,
                  low: c.low * valueMultiplier,
                  high: c.high * valueMultiplier,
                  open: c.open * valueMultiplier,
                  close: c.close * valueMultiplier,
                  volume: c.volume,
                }))
                .sort((a: any, b: any) => a.time - b.time);
              // TradingView requires strictly-increasing times — drop dup buckets.
              const bars = sorted.filter(
                (b: any, i: number) => i === 0 || b.time !== sorted[i - 1].time
              );

              if (!periodParams.firstDataRequest) {
                // Full history already returned on the first request.
                onHistoryCallback([], { noData: true });
                return;
              }
              onHistoryCallback(bars, { noData: bars.length === 0 });
            })();
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
              const oldCandle = (candlesticks && candlesticks.length > 0) ? candlesticks[candlesticks.length - 1] : null;
              setOldCandle(oldCandle);
              console.log(oldCandle);
              if (oldCandle != undefined) {
                const newCandle = formatTradeToCandle(newTrade);
                let i = 0;
                const interval = setInterval(() => {
                  const newCandle = formatTradeToCandle(newTrade);
                  if (newCandle == null) return;
                  const upOrDown =
                    newCandle.close > oldCandle.close
                      ? "arrow_up"
                      : "arrow_down";
                  chart.chart().createShape(
                    {
                      channel: upOrDown == "arrow_up" ? "low" : "high",
                      time: newCandle ? newCandle.timestamp : 0,
                    },
                    {
                      shape: upOrDown,
                      overrides: { arrowColor: "yellow" },
                    }
                  );

                  setTimeout(() => {
                    // remove shape
                    chart.chart().removeAllShapes();
                  }, 50);
                  i++;
                  if (i == 5) {
                    clearInterval(interval);
                  }
                }, 100);
                if (newCandle) {
                  onRealtimeCallback({
                    ...newCandle,
                    open: newCandle.open * valueMultiplier,
                    high: newCandle.high * valueMultiplier,
                    low: newCandle.low * valueMultiplier,
                    close: newCandle.close * valueMultiplier,
                  });
                }
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
          "paneProperties.vertGridProperties.color": "#454545",
          "paneProperties.horzGridProperties.color": "#454545",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.showLeftScale": false, // Disable left scale
          "scalesProperties.showRightScale": true, // Enable right scale
        },
      };
      const chart = new TradingView.widget(widgetOptions as any);
      return () => {
        chart.remove();
      };
    }
  }, [isTVScriptLoaded, candlesticks, height, widthScale, priceMode, valueMultiplier]);

  return (
    <div className="grid h-fit gap-2">
      {showPumpChart && (
        <div className="flex gap-1 h-fit items-center text-sm">
          <span className="text-gray-500 mr-1">chart:</span>
          <div
            onClick={() => setPriceMode("mcap")}
            className={clsx(
              "cursor-pointer px-1 rounded",
              priceMode === "mcap" ? "bg-green-300 text-black" : "hover:bg-gray-800 text-gray-500"
            )}
          >
            MCap (USD)
          </div>
          <div
            onClick={() => setPriceMode("price")}
            className={clsx(
              "cursor-pointer px-1 rounded",
              priceMode === "price" ? "bg-green-300 text-black" : "hover:bg-gray-800 text-gray-500"
            )}
          >
            Price (SOL)
          </div>
        </div>
      )}
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
      <div className={`chart-container ${shouldShake ? "animate-shake" : ""}`}>
        <div
          id={`tv-chart-${Math.random().toString(36).substring(2, 15)}`}
          ref={chartContainerRef}
          className={clsx(!showPumpChart && "hidden")}
          style={{ height: `${height}px`, width: `${widthScale * 100}%` }}
        />

        <div
          className={clsx(styles.dexscreenerEmbed, showPumpChart && "hidden")}
        >
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
