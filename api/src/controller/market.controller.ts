import { TickerRepo } from "@exchange/db";
import { Request, Response } from "express";
import RedisHandler from "../redis";
import { generateAPIResponse, generateErrorResponse } from "../helper";
import { EngineResponse } from "../types/types";

const fetchTickerData = async (req: Request, res: Response): Promise<any> => {
  try {
    const market = req.query.market as string;

    if (!market) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Missing required query parameter: market",
            "FAILED",
            0
          )
        );
    }

    const ticker = await TickerRepo.get24hTicker(market);

    if (!ticker) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "Ticker data not found for this market",
            "FAILED",
            0
          )
        );
    }

    return res
      .status(200)
      .send(
        generateAPIResponse(
          ticker,
          "Ticker data fetched successfully",
          "SUCCESS",
          1
        )
      );
  } catch (error) {
    console.error("Failed to fetch ticker:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchDepth = async (req: Request, res: Response): Promise<any> => {
  try {
    const market = (req.query.symbol || req.query.market) as string;

    if (!market) {
      return res.status(400).json({ error: "Missing market parameter" });
    }

    const redisHandler = await RedisHandler.createInstance();

    // 1. Fetch O(1) snapshot directly from Redis RAM
    const snapshotString = await redisHandler.get(`DEPTH:${market}`);

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

const fetchAllMarkets = async (req: Request, res: Response): Promise<any> => {
  try {
    const user_id = req.user_id;

    if (!user_id) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Missing required fields from request",
            "FAILED",
            0
          )
        );
    }

    const market = {
      action: "FETCH_ALL_MARKETS",
      user_id,
    };

    const redis = await RedisHandler.createInstance();
    const engine_response = (await redis.sendAndAwait({
      type: "MARKET",
      market,
    })) as EngineResponse;

    if (engine_response.eng_status_code === 0) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            engine_response.message,
            engine_response.status,
            0
          )
        );
    }

    return res
      .status(200)
      .send(
        generateAPIResponse(
          engine_response.data,
          engine_response.message,
          engine_response.status,
          1
        )
      );
  } catch (error) {
    console.error("Failed to fetch Market Data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export { fetchTickerData, fetchDepth,fetchAllMarkets };
