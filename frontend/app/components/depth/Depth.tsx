"use client";

import { useEffect, useState, useMemo } from "react";
import { wsClient } from "@/app/utils/wsClient";
// 1. Import the getDepth HTTP call
import { getDepth } from "@/app/utils/httpClient";

export function Depth({ market }: { market: string }) {
  const [bids, setBids] = useState<[string, string][]>();
  const [asks, setAsks] = useState<[string, string][]>();
  const [price, setPrice] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    // 2. FETCH INITIAL SNAPSHOT FROM REDIS API
    getDepth(market)
      .then((data) => {
        if (!isMounted) return;

        const bookData = data.book || data;
        if (bookData.currentPrice) setPrice(bookData.currentPrice.toString());

        if (bookData.bids) {
          const newBids = Object.entries(bookData.bids)
            .map(([p, s]) => [p, String(s)] as [string, string])
            .filter(([p, s]) => Number(s) > 0)
            .sort((a, b) => Number(b[0]) - Number(a[0]));
          setBids(newBids);
        }

        if (bookData.asks) {
          const newAsks = Object.entries(bookData.asks)
            .map(([p, s]) => [p, String(s)] as [string, string])
            .filter(([p, s]) => Number(s) > 0)
            .sort((a, b) => Number(a[0]) - Number(b[0]));
          setAsks(newAsks);
        }
      })
      .catch((err) => console.error("Failed to fetch initial depth", err));

    // 3. HANDLE LIVE WEBSOCKET DELTAS/SNAPSHOTS
    const handleBookUpdate = (data: any) => {
      if (!isMounted) return;
      const bookData = data.book || data;

      if (bookData.bids) {
        const newBids = Object.entries(bookData.bids)
          .map(([p, s]) => [p, String(s)] as [string, string])
          .filter(([p, s]) => Number(s) > 0)
          .sort((a, b) => Number(b[0]) - Number(a[0]));

        setBids(newBids);
      }

      if (bookData.asks) {
        const newAsks = Object.entries(bookData.asks)
          .map(([p, s]) => [p, String(s)] as [string, string])
          .filter(([p, s]) => Number(s) > 0)
          .sort((a, b) => Number(a[0]) - Number(b[0]));

        setAsks(newAsks);
      }
    };

    const handleTradeUpdate = (fills: any) => {
      if (!isMounted) return;
      const tradeData = fills.trade || fills;

      if (
        Array.isArray(tradeData) &&
        tradeData.length > 0 &&
        tradeData[0].price
      ) {
        setPrice(tradeData[0].price.toString());
      }
    };

    wsClient.connect();
    wsClient.subscribe(market, "BOOK", handleBookUpdate);
    wsClient.subscribe(market, "TRADE", handleTradeUpdate);

    return () => {
      isMounted = false;
      wsClient.unsubscribe(market, "BOOK", handleBookUpdate);
      wsClient.unsubscribe(market, "TRADE", handleTradeUpdate);
    };
  }, [market]);

  // Process levels to calculate cumulative totals for the depth bars
  const processLevels = (levels: [string, string][]) => {
    let total = 0;
    return levels.map(([priceStr, quantityStr]) => {
      const numQty = Number(quantityStr);
      total += numQty;
      return {
        price: Number(priceStr).toFixed(2),
        quantity: numQty.toFixed(4),
        total: total,
      };
    });
  };

  const bidsWithTotal = useMemo(
    () => processLevels(bids?.slice(0, 15) || []),
    [bids]
  );
  const asksWithTotal = useMemo(
    () => processLevels(asks?.slice(0, 15) || []).reverse(),
    [asks]
  );

  const maxTotal = Math.max(
    asksWithTotal[0]?.total || 0,
    bidsWithTotal[bidsWithTotal.length - 1]?.total || 0
  );

  const highestBid =
    bidsWithTotal.length > 0 ? Number(bidsWithTotal[0].price) : 0;
  const lowestAsk =
    asksWithTotal.length > 0
      ? Number(asksWithTotal[asksWithTotal.length - 1].price)
      : 0;
  const actualSpread =
    lowestAsk > 0 && highestBid > 0
      ? (lowestAsk - highestBid).toFixed(2)
      : "--";

  return (
    <div className="flex flex-col w-full h-full bg-[#14151B] border-none font-mono text-[11px] select-none">
      {/* Column Labels */}
      <div className="flex flex-row justify-between text-slate-500 px-3 py-1">
        <div className="flex-1 text-left">Price</div>
        <div className="flex-1 text-right">Size</div>
        <div className="flex-1 text-right">Total</div>
      </div>

      {/* ASKS (Selling - Red) */}
      <div className="flex flex-col flex-1 overflow-hidden justify-end pb-1">
        {asksWithTotal.map((ask) => {
          const barWidth = maxTotal > 0 ? (ask.total / maxTotal) * 100 : 0;
          return (
            <div
              key={`ask-${ask.price}`}
              className="relative flex flex-row justify-between px-3 py-[2px] hover:bg-slate-800/50 cursor-pointer group"
            >
              <div
                className="absolute right-0 top-0 h-full bg-[#F94D5C]/10 transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
              <div className="flex-1 text-left text-[#F94D5C] tabular-nums z-10">
                {ask.price}
              </div>
              <div className="flex-1 text-right text-slate-300 tabular-nums z-10">
                {ask.quantity}
              </div>
              <div className="flex-1 text-right text-slate-500 group-hover:text-slate-400 tabular-nums z-10">
                {ask.total.toFixed(4)}
              </div>
            </div>
          );
        })}
      </div>

      {/* SPREAD / LAST PRICE */}
      <div className="flex items-center justify-between px-3 py-2 my-1 border-y border-slate-800/40 bg-[#0E1015]/50">
        <span
          className={`text-[15px] font-semibold ${
            price ? "text-[#00C278]" : "text-slate-500"
          }`}
        >
          {price ? Number(price).toFixed(2) : "--"}
        </span>
        <span className="text-xs text-slate-500">Spread: {actualSpread}</span>
      </div>

      {/* BIDS (Buying - Green) */}
      <div className="flex flex-col flex-1 overflow-hidden pt-1">
        {bidsWithTotal.map((bid) => {
          const barWidth = maxTotal > 0 ? (bid.total / maxTotal) * 100 : 0;
          return (
            <div
              key={`bid-${bid.price}`}
              className="relative flex flex-row justify-between px-3 py-[2px] hover:bg-slate-800/50 cursor-pointer group"
            >
              <div
                className="absolute right-0 top-0 h-full bg-[#00C278]/10 transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
              <div className="flex-1 text-left text-[#00C278] tabular-nums z-10">
                {bid.price}
              </div>
              <div className="flex-1 text-right text-slate-300 tabular-nums z-10">
                {bid.quantity}
              </div>
              <div className="flex-1 text-right text-slate-500 group-hover:text-slate-400 tabular-nums z-10">
                {bid.total.toFixed(4)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
