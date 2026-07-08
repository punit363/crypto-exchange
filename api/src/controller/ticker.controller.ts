import { TickerRepo } from "@exchange/db";
import { Request, Response } from "express";

const fetchTickerData = async (req: Request, res: Response): Promise<any> => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: symbol" });
    }

    const ticker = await TickerRepo.get24hTicker(symbol);
    console.log("ticker--------------");
    console.log("ticker--------------", ticker);
    if (!ticker) {
      // Return default zeros if market exists but has absolutely no history
      return res.json({
        symbol: symbol,
        firstPrice: "0",
        lastPrice: "0",
        high: "0",
        low: "0",
        volume: "0",
        priceChange: "0",
        priceChangePercent: "0",
      });
    }

    res.json(ticker);
  } catch (error) {
    console.error("Failed to fetch ticker:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export { fetchTickerData };
