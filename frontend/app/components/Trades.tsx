"use client";

import { useEffect, useState } from "react";
import { wsClient } from "../utils/wsClient";
import { getTrades } from "../utils/httpClient";

// Defining the shape based on your backend payload
interface Trade {
    tradeId: string;
    price: string | number;
    quantity: string | number;
    bucketTime: number;
    isBuyerMaker?: boolean; // Optional: if your backend adds this later for red/green colors
}

export function Trades({ market }: { market: string }) {
    const [trades, setTrades] = useState<Trade[]>([]);

    useEffect(() => {
        // 1. Fetch the initial snapshot of recent trades
        getTrades(market).then((initialTrades) => {
            // Assuming your HTTP client returns an array of trades
            if (Array.isArray(initialTrades)) {
                setTrades(initialTrades.slice(0, 50));
            }
        }).catch(err => console.error("Failed to fetch initial trades", err));

        // 2. Ensure WebSocket is connected
        wsClient.connect();

        // 3. Handle live trade updates
        const handleTradeUpdate = (fills: Trade[]) => {
            if (fills && fills.length > 0) {
                setTrades((prevTrades) => {
                    // Put new trades at the top, keep the old ones, and cap at 50 to prevent DOM bloat
                    const merged = [...fills, ...prevTrades];
                    return merged.slice(0, 50);
                });
            }
        };

        // 4. Subscribe to the TRADE channel
        wsClient.subscribe(market, "TRADE", handleTradeUpdate);

        // 5. Cleanup on unmount
        return () => {
            wsClient.unsubscribe(market, "TRADE", handleTradeUpdate);
        };
    }, [market]);

    return (
        <div className="flex flex-col h-full w-full bg-baseBackground">
            {/* Header */}
            <div className="flex justify-between px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-800">
                <div className="w-1/3 text-left">Price</div>
                <div className="w-1/3 text-right">Size</div>
                <div className="w-1/3 text-right">Time</div>
            </div>

            {/* Trade List */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {trades.map((trade, index) => {
                    // Basic time formatting (HH:MM:SS)
                    const timeString = new Date(trade.bucketTime || Date.now()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false 
                    });

                    // If your backend doesn't say if it's a buy/sell, we'll default to white for now.
                    // Later, you can compare this price to the previous price to color it red/green!
                    const priceColor = "text-white"; 

                    return (
                        <div 
                            key={trade.tradeId || index} 
                            className="flex justify-between px-4 py-1 text-xs tabular-nums hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                            <div className={`w-1/3 text-left ${priceColor}`}>
                                {Number(trade.price).toFixed(2)}
                            </div>
                            <div className="w-1/3 text-right text-slate-300">
                                {trade.quantity}
                            </div>
                            <div className="w-1/3 text-right text-slate-500">
                                {timeString}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}