"use client";

import { useEffect, useState } from "react";
import { getDepth, getKlines, getTicker, getTrades } from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { wsClient } from "@/app/utils/wsClient";

export function Depth({ market }: {market: string}) {
    const [bids, setBids] = useState<[string, string][]>();
    const [asks, setAsks] = useState<[string, string][]>();
    const [price, setPrice] = useState<string>();

    useEffect(() => {

        const handleBookUpdate = (data: any) => { // data is book_with_quantity
            setBids((prevBids) => {
                const bidMap = new Map(prevBids || []);
                
                // Convert backend object { "210": 60 } to array and loop
                Object.entries(data.bids || {}).forEach(([p, s]) => {
                    // Force size to be string since state is [string, string][]
                    Number(s) === 0 ? bidMap.delete(p) : bidMap.set(p, String(s)); 
                });
                
                return Array.from(bidMap.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
            });

            setAsks((prevAsks) => {
                const askMap = new Map(prevAsks || []);
                
                Object.entries(data.asks || {}).forEach(([p, s]) => {
                    Number(s) === 0 ? askMap.delete(p) : askMap.set(p, String(s));
                });
                
                return Array.from(askMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
            });
        };

        const handleTradeUpdate = (fills: any[]) => { // data is fills array
            if (fills && fills.length > 0 && fills[0].price) {
                setPrice(fills[0].price.toString());
            }
        };

        wsClient.subscribe(market, "BOOK", handleBookUpdate);
        wsClient.subscribe(market, "TRADE", handleTradeUpdate);
    }, [market]);
    
    return <div>
        <TableHeader />
        {asks && <AskTable asks={asks} />}
        {price && <div>{price}</div>}
        {bids && <BidTable bids={bids} />}
    </div>
}

function TableHeader() {
    return <div className="flex justify-between text-xs">
    <div className="text-white">Price</div>
    <div className="text-slate-500">Size</div>
    <div className="text-slate-500">Total</div>
</div>
}