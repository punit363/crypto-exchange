"use client";
import { useState } from "react";
import { createOrder } from "../utils/httpClient";

export function SwapUI({ market }: { market: string }) {
    // Extract base and quote assets from the market (e.g., "BTC_INR" -> Base: BTC, Quote: INR)
    const [baseAsset, quoteAsset] = market.split("_");

    // State Management
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [type, setType] = useState<'limit' | 'market'>('limit');
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");

    // Calculate the total order value safely
    const total = (Number(price) * Number(quantity));

    // Mock Submit Handler - Replace with your actual HTTP client call
    const handleOrderSubmit = async () => {
        // 1. Validation check
        if (!quantity || (type === 'limit' && !price)) {
            console.error("Please enter both price and quantity.");
            return;
        }

        // 2. Build the exact payload object matching the backend request type
        const orderData = {
            user_id: "usr_6q9g3syt014", // Temporary test ID
            
            // Fixes the undefined issue: if it's a market order, pass 0 (or a dummy value)
            price: type === 'market' ? 0 : Number(price), 
            
            quantity: Number(quantity),
            side: activeTab,
            type: type,
            baseAsset: baseAsset,   // Parsed from market.split("_")
            quoteAsset: quoteAsset  // Parsed from market.split("_")
        };
        
        try {
            console.log("Submitting Order to Backend:", orderData);
            // 3. This will now compile perfectly!
            const response = await createOrder(orderData); 
            console.log("Order successful!", response);
            
            setQuantity("");
        } catch (error) {
            console.error("Order submission failed:", error);
        }
    };

    return (
        <div>
            <div className="flex flex-col">
                {/* Buy / Sell Tabs */}
                <div className="flex flex-row h-[60px]">
                    <BuyButton activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SellButton activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                
                <div className="flex flex-col gap-1 mt-2">
                    {/* Limit / Market Tabs */}
                    <div className="px-3">
                        <div className="flex flex-row flex-0 gap-5">
                            <LimitButton type={type} setType={setType} />
                            <MarketButton type={type} setType={setType} />                       
                        </div>
                    </div>
                    
                    <div className="flex flex-col px-3 mt-4">
                        <div className="flex flex-col flex-1 gap-3 text-baseTextHighEmphasis">
                            
                            {/* Balance Display */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between flex-row">
                                    <p className="text-xs font-normal text-slate-400">Available Balance</p>
                                    <p className="font-medium text-xs text-white">0.00 {activeTab === 'buy' ? quoteAsset : baseAsset}</p>
                                </div>
                            </div>
                            
                            {/* Price Input */}
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-normal text-slate-400">Price</p>
                                <div className="flex flex-col relative">
                                    <input 
                                        type="number"
                                        step="0.01" 
                                        placeholder="0" 
                                        disabled={type === 'market'}
                                        value={type === 'market' ? "" : price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className={`h-12 rounded-lg border-2 border-solid border-slate-800 bg-transparent pr-12 text-right text-2xl leading-9 text-white placeholder-slate-500 transition focus:border-blue-500 focus:ring-0 outline-none ${type === 'market' ? 'opacity-50 cursor-not-allowed bg-slate-900' : ''}`} 
                                    />
                                    <div className="flex flex-row absolute right-2 top-3 font-semibold text-slate-400">
                                        {quoteAsset}
                                    </div>
                                    {type === 'market' && (
                                        <div className="absolute left-3 top-3 text-slate-500">
                                            Market Price
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quantity Input */}
                        <div className="flex flex-col gap-2 mt-3">
                            <p className="text-xs font-normal text-slate-400">Quantity</p>
                            <div className="flex flex-col relative">
                                <input 
                                    type="number"
                                    step="0.01" 
                                    placeholder="0" 
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="h-12 rounded-lg border-2 border-solid border-slate-800 bg-transparent pr-12 text-right text-2xl leading-9 text-white placeholder-slate-500 transition focus:border-blue-500 focus:ring-0 outline-none" 
                                />
                                <div className="flex flex-row absolute right-2 top-3 font-semibold text-slate-400">
                                    {baseAsset}
                                </div>
                            </div>
                            
                            {/* Total Value Calculation */}
                            <div className="flex justify-end flex-row mt-1">
                                <p className="font-medium pr-2 text-xs text-slate-400">
                                    ≈ {type === 'market' ? '--' : total.toFixed(2)} {quoteAsset}
                                </p>
                            </div>
                            
                            {/* Percentage Buttons */}
                            <div className="flex justify-between flex-row mt-2 gap-2">
                                {['25%', '50%', '75%', 'Max'].map((percent) => (
                                    <div key={percent} className="flex-1 flex items-center justify-center rounded-full py-1 text-xs cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300">
                                        {percent}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button (Changes color and text based on Buy/Sell) */}
                        <button 
                            type="button" 
                            onClick={handleOrderSubmit}
                            className={`font-semibold text-center h-12 rounded-xl text-base px-4 py-2 my-4 text-white active:scale-95 transition-all outline-none ${activeTab === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                        >
                            {activeTab === 'buy' ? `Buy ${baseAsset}` : `Sell ${baseAsset}`}
                        </button>
                        
                        {/* Order Options */}
                        <div className="flex justify-between flex-row mt-1 text-slate-400">
                            <div className="flex flex-row gap-4">
                                <div className="flex items-center">
                                    <input className="cursor-pointer h-4 w-4 accent-blue-500" id="postOnly" type="checkbox" />
                                    <label htmlFor="postOnly" className="ml-2 text-xs cursor-pointer">Post Only</label>
                                </div>
                                <div className="flex items-center">
                                    <input className="cursor-pointer h-4 w-4 accent-blue-500" id="ioc" type="checkbox" />
                                    <label htmlFor="ioc" className="ml-2 text-xs cursor-pointer">IOC</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Subcomponents with streamlined classes

function LimitButton({ type, setType }: { type: string, setType: (t: 'limit') => void }) {
    return (
        <div className="flex flex-col cursor-pointer justify-center py-2" onClick={() => setType('limit')}>
            <div className={`text-sm font-medium py-1 border-b-2 ${type === 'limit' ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-white"}`}>
                Limit
            </div>
        </div>
    );
}

function MarketButton({ type, setType }: { type: string, setType: (t: 'market') => void }) {
    return (
        <div className="flex flex-col cursor-pointer justify-center py-2" onClick={() => setType('market')}>
            <div className={`text-sm font-medium py-1 border-b-2 ${type === 'market' ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-white"} `}>
                Market
            </div>
        </div>
    );
}

function BuyButton({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: 'buy') => void }) {
    return (
        <div className={`flex flex-col mb-[-2px] flex-1 cursor-pointer justify-center border-b-2 p-4 transition-colors ${activeTab === 'buy' ? 'border-green-500 bg-green-900/20' : 'border-slate-800 hover:border-slate-700'}`} onClick={() => setActiveTab('buy')}>
            <p className={`text-center text-sm font-semibold ${activeTab === 'buy' ? 'text-green-500' : 'text-slate-500'}`}>
                Buy
            </p>
        </div>
    );
}

function SellButton({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: 'sell') => void }) {
    return (
        <div className={`flex flex-col mb-[-2px] flex-1 cursor-pointer justify-center border-b-2 p-4 transition-colors ${activeTab === 'sell' ? 'border-red-500 bg-red-900/20' : 'border-slate-800 hover:border-slate-700'}`} onClick={() => setActiveTab('sell')}>
            <p className={`text-center text-sm font-semibold ${activeTab === 'sell' ? 'text-red-500' : 'text-slate-500'}`}>
                Sell
            </p>
        </div>
    );
}