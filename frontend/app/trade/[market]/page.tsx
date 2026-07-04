"use client";

import { MarketBar } from "@/app/components/MarketBar";
import { SwapUI } from "@/app/components/SwapUI";
import { TradeView } from "@/app/components/TradeView";
import { Depth } from "@/app/components/depth/Depth";
import { Trades } from "@/app/components/Trades"; // Imported our new component
import { useParams } from "next/navigation";

export default function Page() {
    const { market } = useParams();
    
    return (
        <div className="flex flex-row flex-1">
            <div className="flex flex-col flex-1">
                <MarketBar market={market as string} />
                <div className="flex flex-row h-[920px] border-y border-slate-800">
                    
                    {/* Left: Charting Area */}
                    <div className="flex flex-col flex-1 border-r border-slate-800">
                        <TradeView market={market as string} />
                    </div>
                    
                    {/* Right: Orderbook & Recent Trades */}
                    <div className="flex flex-col w-[250px] overflow-hidden">
                        
                        {/* Top Half: Orderbook */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <Depth market={market as string} /> 
                        </div>
                        
                        {/* Bottom Half: Live Trades */}
                        <div className="flex-1 overflow-hidden border-t border-slate-800 flex flex-col">
                            <Trades market={market as string} />
                        </div>
                        
                    </div>
                </div>
            </div>
            
            <div className="w-[10px] flex-col border-slate-800 border-l"></div>
            
            {/* Far Right: Order Entry / Swap UI */}
            <div>
                <div className="flex flex-col w-[250px]">
                    <SwapUI market={market as string} />
                </div>
            </div>
        </div>
    );
}