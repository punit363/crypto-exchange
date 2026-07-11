"use client";

import { useEffect, useState } from "react";
import { getUserOrders } from "../utils/httpClient";

const MOCK_USER_ID = "usr_xslwr9hnet"; 
const SCALE = 100_000_000;

export function OrdersPanel({ market }: { market: string }) {
    const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        const fetchOrders = async () => {
            try {
                const data = await getUserOrders(MOCK_USER_ID, market, activeTab);
                
                if (isMounted) {
                    let parsedOrders: any[] = [];

                    // 1. Handle DB format (Flat Array)
                    if (Array.isArray(data)) {
                        parsedOrders = data;
                    } 
                    // 2. Handle In-Memory Engine Format ({ asks: [], bids: [] })
                    else if (data && typeof data === 'object' && (data.asks || data.bids)) {
                        const asks = Array.isArray(data.asks) ? data.asks : [];
                        const bids = Array.isArray(data.bids) ? data.bids : [];
                        
                        // Combine and filter to only show this user's orders
                        parsedOrders = [...asks, ...bids].filter(
                            (o) => o.userID === MOCK_USER_ID
                        );
                    }

                    setOrders(parsedOrders);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch orders", err);
                if (isMounted) {
                    setOrders([]);
                    setIsLoading(false);
                }
            }
        };

        fetchOrders();

        return () => { isMounted = false; };
    }, [market, activeTab]);

    return (
        <div className={`flex flex-col w-full bg-[#14151B] transition-all duration-300 ease-in-out ${
            isExpanded ? 'h-[280px]' : 'h-[40px]'
        }`}>
            
            {/* Header Tabs & Collapse Button */}
            <div className="flex flex-row items-center justify-between px-4 pt-2 border-b border-slate-800/50 h-[40px] shrink-0">
                <div className="flex flex-row gap-6 h-full">
                    <button 
                        onClick={() => {
                            setActiveTab('open');
                            if (!isExpanded) setIsExpanded(true);
                        }}
                        className={`text-sm font-medium transition-colors h-full flex items-center border-b-2 ${
                            activeTab === 'open' && isExpanded
                            ? 'border-blue-500 text-white' 
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Open Orders
                    </button>
                    <button 
                        onClick={() => {
                            setActiveTab('history');
                            if (!isExpanded) setIsExpanded(true);
                        }}
                        className={`text-sm font-medium transition-colors h-full flex items-center border-b-2 ${
                            activeTab === 'history' && isExpanded
                            ? 'border-blue-500 text-white' 
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Order History
                    </button>
                </div>

                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-slate-500 hover:text-white transition-colors p-1 rounded"
                >
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </div>

            { }
            <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="grid grid-cols-7 gap-4 px-4 py-2 text-[11px] font-medium text-slate-500 border-b border-slate-800/30">
                    <div>Time</div>
                    <div>Pair</div>
                    <div>Type / Side</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Amount</div>
                    <div className="text-right">Filled</div>
                    <div className="text-right">Status</div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                            Loading...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                            No {activeTab} orders found.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {orders.map((order, i) => {
                                const isBuy = order.side.toLowerCase() === 'buy';
                                
                                // Safely handle dates (in-memory engine orders don't have created_at)
                                const hasDate = !!order.created_at;
                                const dateObj = hasDate ? new Date(order.created_at) : null;
                                
                                // Fallbacks for differing property names between DB and RAM
                                const filledQty = order.filled ?? order.filled_quantity ?? 0;
                                const type = order.type || "limit"; // In-memory resting orders are always limit orders
                                const uniqueKey = order.orderId || order.order_id || i;

                                return (
                                    <div key={uniqueKey} className="grid grid-cols-7 gap-4 px-4 py-2.5 text-xs hover:bg-slate-800/30 border-b border-slate-800/30 group">
                                        <div className="text-slate-400 font-mono text-[11px] flex flex-col justify-center">
                                            <span>{hasDate ? dateObj!.toLocaleDateString() : "Just now"}</span>
                                            <span className="text-slate-600">
                                                {hasDate ? dateObj!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                                            </span>
                                        </div>
                                        <div className="font-medium text-slate-300 flex items-center">
                                            {market.replace("_", "/")}
                                        </div>
                                        <div className="flex items-center">
                      <span className="capitalize text-slate-400">{type}</span>
                      <span
                        className={`ml-2 font-medium ${
                          isBuy ? "text-[#00C278]" : "text-[#F94D5C]"
                        }`}
                      >
                        {isBuy ? "Buy" : "Sell"}
                      </span>
                    </div>
                    <div className="text-right tabular-nums text-slate-300 flex items-center justify-end">
                      {(Number(order.price) / SCALE).toFixed(2)}
                    </div>
                    <div className="text-right tabular-nums text-slate-300 flex items-center justify-end">
                      {(Number(order.quantity) / SCALE).toFixed(4)}
                    </div>
                    <div className="text-right tabular-nums text-slate-400 flex items-center justify-end">
                      {(Number(filledQty) / SCALE).toFixed(4)}
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                      <span className="capitalize text-slate-300">
                        {order.status}
                      </span>
                                        </div>
                                        <div className="text-right tabular-nums text-slate-300 flex items-center justify-end">
                                            {Number(order.price / SCALE).toFixed(2)}
                                        </div>
                                        <div className="text-right tabular-nums text-slate-300 flex items-center justify-end">
                                            {Number(order.quantity / SCALE).toFixed(4)}
                                        </div>
                                        <div className="text-right tabular-nums text-slate-400 flex items-center justify-end">
                                            {Number(order.filled_quantity ?? order.filled ?? 0 / SCALE).toFixed(4)}
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-2">
                                            <span className="capitalize text-slate-300">
                                                {order.status}
                                            </span>
                                            {activeTab === 'open' && (
                                                <button className="text-[#F94D5C] ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}