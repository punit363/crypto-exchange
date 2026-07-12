"use client";

import { SwapUI } from "./SwapUI";
import { Depth } from "./depth/Depth";
import { OrdersPanel } from "./OrderPanel";
import { Markets } from "./Markets";
import { logout } from "../utils/httpClient";

interface TradingDashboardProps {
  currentUser: any;
  onLogout: () => void;
}

export function TradingDashboard({ currentUser, onLogout }: TradingDashboardProps) {
  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <main className="min-h-screen w-full bg-[#0E1015] flex flex-col text-white font-sans overflow-hidden">
      {/* Platform Workspace Navigation Header */}
      <header className="h-14 border-b border-slate-900 bg-[#14151B] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#00C278]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="font-bold text-sm tracking-wide text-white uppercase">Apex Terminal</span>
        </div>

        {/* User Context details */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">
              {currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}` : currentUser.user_id}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{currentUser.email}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-lg border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-xs font-medium text-slate-400 hover:text-red-400 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        
        {/* Left Section: Real-time Orderbook */}
        <div className="w-[320px] border-r border-slate-900 bg-[#14151B]/40 flex flex-col shrink-0">
          <Depth market="BTC_INR" />
        </div>

        {/* Center Panel (Trading Markets index list) and Execution column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 min-h-0 overflow-y-auto no-scrollbar">
            
            {/* Limit execution UI column */}
            <div className="lg:col-span-1">
              <SwapUI market="BTC_INR" />
            </div>

            {/* Markets Dashboard widget */}
            <div className="lg:col-span-2 flex flex-col bg-[#14151B]/40 border border-slate-900 rounded-xl p-4 overflow-y-auto no-scrollbar">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Spot Markets Index</h2>
              <Markets />
            </div>

          </div>

          {/* Lower Workspace: Open Orders ledger */}
          <div className="h-[280px] border-t border-slate-900 bg-[#14151B]/20 shrink-0">
            <OrdersPanel market="BTC_INR" />
          </div>
        </div>

      </div>
    </main>
  );
}