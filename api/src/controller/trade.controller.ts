import { prisma } from "@exchange/db";
import { Request, Response } from "express";
import { generateAPIResponse, generateErrorResponse } from "../helper";

const getTrades = async (req: Request, res: Response): Promise<any> => {
  try {
    const market = req.query.market as string;

    if (!market) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Missing query parameter from request",
            "FAILED",
            0
          )
        );
    }

    const [baseAsset, quoteAsset] = market.split("_");

    if (!baseAsset || !quoteAsset) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Invalid market format. Use BASE_QUOTE.",
            "FAILED",
            0
          )
        );
    }

    const recentTrades = await prisma.trade.findMany({
      where: {
        base_asset: baseAsset,
        quote_asset: quoteAsset,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 50,
    });

    if (recentTrades.length <= 0) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "Recent Trades does not exist for this market",
            "FAILED",
            0
          )
        );
    }

    const formattedTrades = recentTrades.map((trade) => ({
      tradeId: trade.trade_id,
      price: trade.price.toString(),
      quantity: trade.quantity.toString(),
      timestamp: trade.created_at.getTime(),
      isBuyerMaker: trade.side.toLowerCase() === "sell",
    }));

    return res
      .status(200)
      .send(
        generateAPIResponse(
          formattedTrades,
          "Trade data fetched successfully",
          "SUCCESS",
          1
        )
      );
  } catch (error) {
    console.error("Failed to fetch recent trades:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export { getTrades };
