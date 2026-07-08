import { TickerRepo } from "@exchange/db";
import { Request, Response } from "express";
import RedisHandler from "../redis";

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

const fetchDepth = async (req: Request, res: Response): Promise<any> => {
  try {
    const symbol = (req.query.symbol || req.query.market) as string;

    if (!symbol) {
      return res.status(400).json({ error: "Missing symbol parameter" });
    }

    const redisHandler = await RedisHandler.createInstance();

    // 1. Fetch O(1) snapshot directly from Redis RAM
    const snapshotString = await redisHandler.get(`DEPTH:${symbol}`);

    if (snapshotString) {
      // 2. Parse and return to the frontend
      res.json(JSON.parse(snapshotString));
    } else {
      // Safe fallback if the engine just booted up and the book is completely empty
      res.json({ bids: {}, asks: {} });
    }
  } catch (error) {
    console.error("Failed to fetch depth from Redis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export { fetchTickerData, fetchDepth };
