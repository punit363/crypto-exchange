"use client";

import { useEffect, useRef, useState } from "react";
import { ChartManager } from "../utils/ChartManager";
import { getKlines } from "../utils/httpClient";
import { KLine } from "../utils/types";
import { wsClient } from "../utils/wsClient";

const INTERVALS = ["1m", "5m", "15m", "1h", "1d"];
const SCALE = 100000000;

export function KlineChart({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);

  // State for chart controls
  const [activeInterval, setActiveInterval] = useState("1m"); // Defaulting to 1m for active visual testing

  // Helper to dynamically size the fetch window based on interval
  const getLookbackWindow = (interval: string) => {
    const now = new Date().getTime();
    switch (interval) {
      case "1m":
        return now - 1000 * 60 * 60 * 24; // 1 day in milliseconds
      case "5m":
        return now - 1000 * 60 * 60 * 24 * 3; // 3 days in milliseconds
      case "15m":
        return now - 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds
      case "1h":
        return now - 1000 * 60 * 60 * 24 * 30; // 30 days in milliseconds
      case "1d":
        return now - 1000 * 60 * 60 * 24 * 365; // 1 year in milliseconds
      default:
        return now - 1000 * 60 * 60 * 24 * 7;
    }
  };
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      let klineData: KLine[] = [];

      // FIX: Query the backend using 10-digit SECONDS to match backend parsing requirements.
      const endTime = Math.floor(new Date().getTime() / 1000);
      const startTime = Math.floor(getLookbackWindow(activeInterval) / 1000);

      console.log(
        `[KLINE FETCH] Querying ${activeInterval} for ${market}. Start: ${startTime}, End: ${endTime}`
      );
      try {
        klineData = await getKlines(market, activeInterval, startTime, endTime);
        console.log(
          "[KLINE FETCH] Successfully retrieved candles count:",
          klineData?.length
        );
      } catch (e) {
        console.error("Failed to fetch klines", e);
      }

      if (!isMounted) return;

      if (chartRef.current) {
        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
          chartManagerRef.current = null;
        }

        // Map database candle objects to ChartManager interface defensively
        const formattedKlines = (klineData || [])
          .map((x) => {
            const timestampMs = Number(x.end);
            return {
              close: parseFloat(x.close) / SCALE,
              high: parseFloat(x.high) / SCALE,
              low: parseFloat(x.low) / SCALE,
              open: parseFloat(x.open) / SCALE,
              timestamp: new Date(timestampMs),
              // Provide both formats to be robust with standard Lightweight Charts versions
              time: Math.floor(timestampMs / 1000),
            };
          })
          .sort((x, y) => x.timestamp.getTime() - y.timestamp.getTime());

        console.log(
          "[KLINE RENDER] Initializing chart with sorted candles:",
          formattedKlines
        );

        const chartManager = new ChartManager(
          chartRef.current,
          formattedKlines,
          {
            background: "#0e0f14",
            color: "white",
          },
          activeInterval
        );

        chartManagerRef.current = chartManager;
      }
    };

    init();
    wsClient.connect();

    // WS Trade subscriber (Live updates)
    const handleTradeUpdate = (data: any) => {
      if (!isMounted || !chartManagerRef.current) return;
      console.log("[KLINE WS] Received raw trade transaction update:", data);

      // Extract raw fill arrays defensively
      const fillList = Array.isArray(data)
        ? data
        : data.trade || data.data || [];

      if (Array.isArray(fillList) && fillList.length > 0) {
        const latestPrice = Number(fillList[0].price) / SCALE;
        const tradeTime = fillList[0].bucketTime || Date.now();

        console.log(
          `[KLINE LIVE UPDATE] Pushing price level: ${latestPrice} @ time: ${tradeTime}`
        );

        // Feed the live price update directly into the active charting engine
        chartManagerRef.current.updateLivePrice(latestPrice, tradeTime);
      }
    };

    wsClient.subscribe(market, "TRADE", handleTradeUpdate);

    return () => {
      isMounted = false;
      wsClient.unsubscribe(market, "TRADE", handleTradeUpdate);
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
  }, [market, activeInterval]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0e0f14]">
      {/* Chart Toolbar */}
      <div className="flex flex-row items-center justify-between px-4 py-2 border-b border-slate-800">
        <div className="flex flex-row gap-2">
          {INTERVALS.map((interval) => (
            <button
              key={interval}
              onClick={() => setActiveInterval(interval)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeInterval === interval
                  ? "bg-slate-800 text-blue-500 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {interval}
            </button>
          ))}
        </div>

        <div className="flex items-center text-slate-500 hover:text-white cursor-pointer px-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full relative">
        <div ref={chartRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
