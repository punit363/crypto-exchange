import { prisma } from "@exchange/db";
import { Request, Response } from "express";

const getTrades = async (req: Request, res: Response): Promise<any> => {
  try {
    // Support both ?market=BTC_INR and ?symbol=BTC_INR
    // depending on exactly what httpClient.ts sends
    const market = (req.query.market || req.query.symbol) as string;

    if (!market) {
      return res.status(400).json({ error: "Missing market/symbol parameter" });
    }

    const [baseAsset, quoteAsset] = market.split("_");

    if (!baseAsset || !quoteAsset) {
      return res
        .status(400)
        .json({ error: "Invalid market format. Use BASE_QUOTE." });
    }

    // 1. Fetch the 50 most recent trades for this specific market
    const recentTrades = await prisma.trade.findMany({
      where: {
        base_asset: baseAsset,
        quote_asset: quoteAsset,
      },
      orderBy: {
        created_at: "desc", // Newest trades first
      },
      take: 50,
    });

    // 2. Map the Prisma models to the exact shape the React frontend expects
    const formattedTrades = recentTrades.map((trade) => ({
      tradeId: trade.trade_id,
      price: trade.price.toString(), // Convert Decimal to string
      quantity: trade.quantity.toString(), // Convert Decimal to string
      timestamp: trade.created_at.getTime(), // Convert DateTime to Unix ms timestamp

      // If the aggressor (user_id) placed a "sell", the resting order (maker) was a "buy".
      // isBuyerMaker = true results in a RED trade on the UI.
      // isBuyerMaker = false results in a GREEN trade on the UI.
      isBuyerMaker: trade.side.toLowerCase() === "sell",
    }));

    res.json(formattedTrades);
  } catch (error) {
    console.error("Failed to fetch recent trades:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export { getTrades };
