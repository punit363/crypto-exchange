"use client";

import { SwapUI } from "./SwapUI";
import { Depth } from "./depth/Depth";
import { OrdersPanel } from "./OrderPanel";
import { logout } from "../utils/httpClient";

interface TradingDashboardProps {
  currentUser: any;
  onLogout: () => void;
  market?: string; // Optional dynamic routing prop
}

export function TradingDashboard({ currentUser, onLogout, market = "BTC_INR" }: TradingDashboardProps) {
  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <main className="h-[calc(100vh-3.5rem)] w-full bg-[#0E1015] flex flex-col text-white font-sans overflow-hidden">
      
      {/* Main Grid Workspace */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        
        {/* Left Section: Real-time Orderbook */}
        <div className="w-[320px] border-r border-slate-900 bg-[#14151B]/40 flex flex-col shrink-0">
          <Depth market={market} />
        </div>

        {/* Center Panel and Execution column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 min-h-0 overflow-y-auto no-scrollbar">
            
            {/* Limit execution UI column */}
            <div className="lg:col-span-1">
              <SwapUI market={market} />
            </div>

          </div>

          {/* Lower Workspace: Open Orders ledger */}
          <div className="h-[280px] border-t border-slate-900 bg-[#14151B]/20 shrink-0">
            <OrdersPanel market={market} />
          </div>
        </div>

      </div>
    </main>
  );
}
