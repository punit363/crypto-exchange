"use client";

import { useEffect, useState, useMemo } from "react";
import { wsClient } from "@/app/utils/wsClient";

export function Depth({ market }: { market: string }) {
    const [bids, setBids] = useState<[string, string][]>();
    const [asks, setAsks] = useState<[string, string][]>();
    const [price, setPrice] = useState<string>();

    useEffect(() => {
        const handleBookUpdate = (data: any) => {
            // 1. Unwrap the backend payload!
            const bookData = data.book || data;

            setBids((prevBids) => {
                const bidMap = new Map(prevBids || []);
                
                // 2. Use the unwrapped bookData
                Object.entries(bookData.bids || {}).forEach(([p, s]) => {
                    Number(s) === 0 ? bidMap.delete(p) : bidMap.set(p, String(s)); 
                });
                
                return Array.from(bidMap.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
            });

            setAsks((prevAsks) => {
                const askMap = new Map(prevAsks || []);
                
                // 2. Use the unwrapped bookData
                Object.entries(bookData.asks || {}).forEach(([p, s]) => {
                    Number(s) === 0 ? askMap.delete(p) : askMap.set(p, String(s));
                });
                
                return Array.from(askMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
            });
        };

        const handleTradeUpdate = (fills: any[]) => {
            console.log("🚨 RAW WS TRADE DATA:", fills); // ADD THIS LINE
            if (fills && fills.length > 0 && fills[0].price) {
                setPrice(fills[0].price.toString());
            }
        };

        wsClient.subscribe(market, "BOOK", handleBookUpdate);
        wsClient.subscribe(market, "TRADE", handleTradeUpdate);

        return () => {
            wsClient.unsubscribe(market, "BOOK", handleBookUpdate);
            wsClient.unsubscribe(market, "TRADE", handleTradeUpdate);
        };
    }, [market]);

    // 1. Process levels to calculate cumulative totals for the depth bars
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

    // Slice to top 15 so we don't render thousands of DOM nodes
    const bidsWithTotal = useMemo(() => processLevels(bids?.slice(0, 15) || []), [bids]);
    
    // Asks are sorted ascending (lowest first). We calculate totals starting from the lowest ask, 
    // then REVERSE the array so the lowest ask renders at the bottom, right above the spread.
    const asksWithTotal = useMemo(() => processLevels(asks?.slice(0, 15) || []).reverse(), [asks]);

    // 2. Find maximum total to dynamically scale the background depth bars
    const maxTotal = Math.max(
        asksWithTotal[0]?.total || 0, // After reversing, the largest total is at index 0
        bidsWithTotal[bidsWithTotal.length - 1]?.total || 0
    );

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
                {asksWithTotal.map((ask, i) => {
                    const barWidth = maxTotal > 0 ? (ask.total / maxTotal) * 100 : 0;
                    return (
                        <div key={`ask-${ask.price}`} className="relative flex flex-row justify-between px-3 py-[2px] hover:bg-slate-800/50 cursor-pointer group">
                            <div 
                                className="absolute right-0 top-0 h-full bg-[#F94D5C]/10 transition-all duration-300"
                                style={{ width: `${barWidth}%` }}
                            />
                            <div className="flex-1 text-left text-[#F94D5C] tabular-nums z-10">{ask.price}</div>
                            <div className="flex-1 text-right text-slate-300 tabular-nums z-10">{ask.quantity}</div>
                            <div className="flex-1 text-right text-slate-500 group-hover:text-slate-400 tabular-nums z-10">{ask.total.toFixed(4)}</div>
                        </div>
                    );
                })}
            </div>

            {/* SPREAD / LAST PRICE */}
            <div className="flex items-center justify-between px-3 py-2 my-1 border-y border-slate-800/40 bg-[#0E1015]/50">
                <span className={`text-[15px] font-semibold ${price ? 'text-[#00C278]' : 'text-slate-500'}`}>
                    {price ? Number(price).toFixed(2) : "--"}
                </span>
                <span className="text-xs text-slate-500 line-through decoration-slate-600">Spread</span>
            </div>

            {/* BIDS (Buying - Green) */}
            <div className="flex flex-col flex-1 overflow-hidden pt-1">
                {bidsWithTotal.map((bid, i) => {
                    const barWidth = maxTotal > 0 ? (bid.total / maxTotal) * 100 : 0;
                    return (
                        <div key={`bid-${bid.price}`} className="relative flex flex-row justify-between px-3 py-[2px] hover:bg-slate-800/50 cursor-pointer group">
                            <div 
                                className="absolute right-0 top-0 h-full bg-[#00C278]/10 transition-all duration-300"
                                style={{ width: `${barWidth}%` }}
                            />
                            <div className="flex-1 text-left text-[#00C278] tabular-nums z-10">{bid.price}</div>
                            <div className="flex-1 text-right text-slate-300 tabular-nums z-10">{bid.quantity}</div>
                            <div className="flex-1 text-right text-slate-500 group-hover:text-slate-400 tabular-nums z-10">{bid.total.toFixed(4)}</div>
                        </div>
                    );
                })}
            </div>
            
        </div>
    );
}