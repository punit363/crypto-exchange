"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Ticker as TickerType } from "../utils/types";
import { getTicker } from "../utils/httpClient";
import { wsClient } from "../utils/wsClient";

const SCALE = 100_000_000;

export const MarketBar = ({ market }: { market: string }) => {
  const [ticker, setTicker] = useState<TickerType | null>(null);

  // Helper to normalize the new nested ticker schema and dynamically calculate differences
  const normalizeTickerData = (raw: any): TickerType | null => {
    if (!raw) return null;

    // Check if payload is wrapped inside the new { market, ticker: { ... } } structure
    const target = raw.ticker ? raw.ticker : raw;

    const openPrice = Number(target.open || 0);
    const lastPrice = Number(target.lastPrice || target.close || 0);
    
    // Calculate 24H Price Change metrics on the fly
    const priceChange = lastPrice - openPrice;
    const priceChangePercent = openPrice > 0 ? (priceChange / openPrice) * 100 : 0;

    return {
      symbol: raw.market || target.symbol || market,
      high: String(target.high || "0"),
      low: String(target.low || "0"),
      lastPrice: String(lastPrice),
      volume: String(target.volume || "0"),
      firstPrice: String(openPrice),
      priceChange: String(priceChange),
      priceChangePercent: priceChangePercent.toFixed(2),
      quoteVolume: String(target.quoteVolume || "0"),
      trades: String(target.trades || "0"),
    };
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch initial snapshot from REST API
    getTicker(market)
      .then((data) => {
        if (isMounted && data) {
          const normalized = normalizeTickerData(data);
          setTicker(normalized);
        }
      })
      .catch(console.error);

    // 2. Connect WebSocket
    wsClient.connect();

    // 3. Define the update handler mapping the new WebSocket envelope
    const handleTickerUpdate = (data: any) => {
      if (!isMounted || !data) return;

      console.log("[MARKETBAR WS] Received ticker packet:", data);
      const incomingNormalized = normalizeTickerData(data);

      if (incomingNormalized) {
        setTicker(incomingNormalized);
      }
    };

    // 4. Subscribe to the market's ticker stream
    wsClient.subscribe(market, "TICKER", handleTickerUpdate);

    // 5. Cleanup
    return () => {
      isMounted = false;
      wsClient.unsubscribe(market, "TICKER", handleTickerUpdate);
    };
  }, [market]);

  // Safely parse numbers to prevent NaN rendering
  const changeAmount = Number(ticker?.priceChange || 0);
  const changePercent = Number(ticker?.priceChangePercent || 0);
  const isPositive = changeAmount >= 0;

  return (
    <div className="flex flex-row items-center w-full h-[64px] bg-[#14151B] border-b border-slate-800/50 overflow-hidden select-none">
      <div className="flex items-center flex-row overflow-x-auto no-scrollbar w-full">
        {/* Logos & Pair Name */}
        <Ticker market={market} />

        <div className="flex items-center flex-row space-x-8 pl-6">
          {/* Last Price */}
          <div className="flex flex-col justify-center">
            <p className={`font-semibold text-lg tabular-nums ${isPositive ? "text-[#00C278]" : "text-[#F94D5C]"}`}>
              {ticker?.lastPrice ? (Number(ticker.lastPrice) / SCALE).toFixed(2) : "--"}
            </p>
            <p className="font-medium text-xs text-slate-500 tabular-nums">
              ${ticker?.lastPrice ? (Number(ticker.lastPrice) / SCALE).toFixed(2) : "--"}
            </p>
          </div>

          {/* 24H Change */}
          <div className="flex flex-col">
            <p className="font-medium text-[11px] text-slate-500 mb-0.5">
              24H Change
            </p>
            <p className={`text-sm font-medium tabular-nums ${ticker ? (isPositive ? "text-[#00C278]" : "text-[#F94D5C]") : "text-slate-500"}`}>
              {ticker ? `${isPositive ? "+" : ""}${(changeAmount / SCALE).toFixed(2)}  ${isPositive ? "+" : ""}${changePercent.toFixed(2)}%` : "--"}
            </p>
          </div>

          {/* 24H High */}
          <div className="flex flex-col">
            <p className="font-medium text-[11px] text-slate-500 mb-0.5">
              24H High
            </p>
            <p className="text-sm font-medium tabular-nums text-slate-200">
              {ticker?.high ? (Number(ticker.high) / SCALE).toFixed(2) : "--"}
            </p>
          </div>

          {/* 24H Low */}
          <div className="flex flex-col">
            <p className="font-medium text-[11px] text-slate-500 mb-0.5">
              24H Low
            </p>
            <p className="text-sm font-medium tabular-nums text-slate-200">
              {ticker?.low ? (Number(ticker.low) / SCALE).toFixed(2) : "--"}
            </p>
          </div>

          {/* 24H Volume */}
          <div className="flex flex-col">
            <p className="font-medium text-[11px] text-slate-500 mb-0.5">
              24H Volume
            </p>
            <p className="text-sm font-medium tabular-nums text-slate-200">
              {ticker?.volume ? (Number(ticker.volume) / SCALE).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
function Ticker({ market }: { market: string }) {
  const [base, quote] = market.split("_");

  const getIconUrl = (symbol: string) => `/icons/${symbol.toLowerCase()}_coin.svg`;

  return (
    <div className="flex items-center h-full shrink-0 pr-6 border-r border-slate-800/50 pl-4">
      <div className="flex flex-row relative -mr-2">
        {/* Base Asset Icon */}
        <Image
          alt={base}
          className="z-10 rounded-full h-7 w-7 border-2 border-[#14151B]"
          src={getIconUrl(base)}
          width={28}
          height={28}
          // Optional: fallback to a generic icon if the specific one doesn't exist
          onError={(e) => { e.currentTarget.src = "/icons/generic_coin.svg"; }}
        />
        {/* Quote Asset Icon */}
        <Image
          alt={quote}
          className="rounded-full h-7 w-7 border-2 border-[#14151B]"
          src={getIconUrl(quote)}
          width={28}
          height={28}
          onError={(e) => { e.currentTarget.src = "/icons/generic_coin.svg"; }}
        />
      </div>
      <div className="flex items-center cursor-pointer rounded-lg p-3 hover:opacity-80 transition-opacity">
        <p className="font-bold text-lg text-white ml-2">
          {base} <span className="text-slate-500">/</span> {quote}
        </p>
      </div>
    </div>
  );
}