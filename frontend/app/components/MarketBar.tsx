"use client";

import { useEffect, useState } from "react";
import { Ticker as TickerType } from "../utils/types";
import { getTicker } from "../utils/httpClient";
import { wsClient } from "../utils/wsClient";

export const MarketBar = ({ market }: { market: string }) => {
    const [ticker, setTicker] = useState<TickerType | null>(null);

    useEffect(() => {
        let isMounted = true;

        // 1. Fetch initial snapshot
        getTicker(market).then((data) => {
            if (isMounted) setTicker(data);
        }).catch(console.error);

        // 2. Ensure WebSocket is connected
        wsClient.connect();

        // 3. Define the update handler using your robust mapping
        const handleTickerUpdate = (data: Partial<TickerType>) => {
            if (!isMounted) return;
            
            setTicker(prevTicker => ({
                firstPrice: data?.firstPrice ?? prevTicker?.firstPrice ?? '',
                high: data?.high ?? prevTicker?.high ?? '',
                lastPrice: data?.lastPrice ?? prevTicker?.lastPrice ?? '',
                low: data?.low ?? prevTicker?.low ?? '',
                priceChange: data?.priceChange ?? prevTicker?.priceChange ?? '',
                priceChangePercent: data?.priceChangePercent ?? prevTicker?.priceChangePercent ?? '',
                quoteVolume: data?.quoteVolume ?? prevTicker?.quoteVolume ?? '',
                symbol: data?.symbol ?? prevTicker?.symbol ?? '',
                trades: data?.trades ?? prevTicker?.trades ?? '',
                volume: data?.volume ?? prevTicker?.volume ?? '',
            }));
        };

        // 4. Subscribe
        wsClient.subscribe(market, "TICKER", handleTickerUpdate);

        // 5. Cleanup
        return () => {
            isMounted = false;
            wsClient.unsubscribe(market, "TICKER", handleTickerUpdate);
        };
    }, [market]);
    
    // Safely parse numbers to prevent NaN%
    const changeAmount = Number(ticker?.priceChange || 0);
    const changePercent = Number(ticker?.priceChangePercent || 0);
    const isPositive = changeAmount >= 0;

    return (
        <div className="flex flex-row items-center w-full h-[64px] bg-[#14151B] border-b border-slate-800/50 overflow-hidden">
            <div className="flex items-center flex-row overflow-x-auto no-scrollbar w-full">
                
                {/* 1. Coin Logos & Title (Your Ticker Component) */}
                <Ticker market={market} />
                
                <div className="flex items-center flex-row space-x-8 pl-6">
                    
                    {/* 2. Last Price */}
                    <div className="flex flex-col justify-center">
                        <p className={`font-semibold text-lg tabular-nums ${isPositive ? "text-[#00C278]" : "text-[#F94D5C]"}`}>
                            {ticker?.lastPrice ? Number(ticker.lastPrice).toFixed(2) : "--"}
                        </p>
                        <p className="font-medium text-xs text-slate-500 tabular-nums">
                            ${ticker?.lastPrice ? Number(ticker.lastPrice).toFixed(2) : "--"}
                        </p>
                    </div>
                    
                    {/* 3. 24H Change */}
                    <div className="flex flex-col">
                        <p className="font-medium text-[11px] text-slate-500 mb-0.5">24H Change</p>
                        <p className={`text-sm font-medium tabular-nums ${ticker ? (isPositive ? "text-[#00C278]" : "text-[#F94D5C]") : "text-slate-500"}`}>
                            {ticker ? (
                                `${isPositive ? "+" : ""}${changeAmount.toFixed(2)}  ${isPositive ? "+" : ""}${changePercent.toFixed(2)}%`
                            ) : "--"}
                        </p>
                    </div>

                    {/* 4. 24H High */}
                    <div className="flex flex-col">
                        <p className="font-medium text-[11px] text-slate-500 mb-0.5">24H High</p>
                        <p className="text-sm font-medium tabular-nums text-slate-200">
                            {ticker?.high ? Number(ticker.high).toFixed(2) : "--"}
                        </p>
                    </div>
                    
                    {/* 5. 24H Low */}
                    <div className="flex flex-col">
                        <p className="font-medium text-[11px] text-slate-500 mb-0.5">24H Low</p>
                        <p className="text-sm font-medium tabular-nums text-slate-200">
                            {ticker?.low ? Number(ticker.low).toFixed(2) : "--"}
                        </p>
                    </div>
                    
                    {/* 6. 24H Volume */}
                    <div className="flex flex-col">
                        <p className="font-medium text-[11px] text-slate-500 mb-0.5">24H Volume</p>
                        <p className="text-sm font-medium tabular-nums text-slate-200">
                            {ticker?.volume ? Number(ticker.volume).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"}
                        </p>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};

// Your original Ticker component, styled to fit the panel
function Ticker({ market }: { market: string }) {
    return (
        <div className="flex items-center h-full shrink-0 pr-6 border-r border-slate-800/50 pl-4">
            <div className="flex flex-row relative -mr-2">
                <img 
                    alt="Base Asset" 
                    loading="lazy" 
                    className="z-10 rounded-full h-7 w-7 border-2 border-[#14151B]"  
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVvBqZC_Q1TSYObZaMvK0DRFeHZDUtVMh08Q&s" 
                />
                <img 
                    alt="Quote Asset" 
                    loading="lazy"
                    className="h-7 w-7 -ml-2 rounded-full border-2 border-[#14151B]" 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVvBqZC_Q1TSYObZaMvK0DRFeHZDUtVMh08Q&s" 
                />
            </div>
            <div className="flex items-center cursor-pointer rounded-lg p-3 hover:opacity-80 transition-opacity">
                <p className="font-bold text-lg text-white">
                    {market.replace("_", " / ")}
                </p>
            </div>
        </div>
    );
}