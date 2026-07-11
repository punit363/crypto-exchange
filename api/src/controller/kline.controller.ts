import { prisma } from "@exchange/db";
import { Request, Response } from "express";
import { generateAPIResponse, generateErrorResponse } from "../helper";

const fetchKline = async (req: Request, res: Response): Promise<any> => {
  try {
    const market = req.query.market as string;
    const reqInterval = req.query.interval as string;
    const startTime = parseInt(req.query.startTime as string);
    const endTime = parseInt(req.query.endTime as string);
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    if (!market || !reqInterval || !startTime || !endTime) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Required data missing in request query.",
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

    let pgInterval = "1 hour";
    switch (reqInterval) {
      case "1m":
        pgInterval = "1 minute";
        break;
      case "5m":
        pgInterval = "5 minutes";
        break;
      case "15m":
        pgInterval = "15 minutes";
        break;
      case "1h":
        pgInterval = "1 hour";
        break;
      case "1d":
        pgInterval = "1 day";
        break;
    }

    const result = await prisma.$queryRaw<any[]>`
            SELECT 
                date_bin(CAST(${pgInterval} AS interval), created_at, TIMESTAMP '2000-01-01') AS bucket_time,
                (array_agg(open ORDER BY created_at ASC))[1] AS open,
                MAX(high) AS high,
                MIN(low) AS low,
                (array_agg(close ORDER BY created_at DESC))[1] AS close,
                SUM(volume) AS volume
            FROM candles
            WHERE base_asset = ${baseAsset}
              AND quote_asset = ${quoteAsset}
              AND interval = '1m'
              AND created_at >= to_timestamp(${startTime}) 
              AND created_at <= to_timestamp(${endTime})
            GROUP BY bucket_time
            ORDER BY bucket_time DESC
            LIMIT ${limit};
        `;

    if (result.length <= 0) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "Kline data does not exist for this timeframe.",
            "FAILED",
            0
          )
        );
    }

    const formattedKlines = result
      .map((row) => ({
        end: new Date(row.bucket_time).getTime(),
        open: row.open.toString(),
        high: row.high.toString(),
        low: row.low.toString(),
        close: row.close.toString(),
        volume: row.volume.toString(),
      }))
      .reverse();

    return res
      .status(200)
      .send(
        generateAPIResponse(
          formattedKlines,
          "Kline data fetched successfully",
          "SUCCESS",
          1
        )
      );
  } catch (error) {
    console.error("Error fetching klines via Prisma:", error);
    res.status(500).json({ error: "Failed to fetch klines" });
  }
};

export { fetchKline };
