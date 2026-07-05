import { prisma } from "@exchange/db";
import { Request, Response } from "express";
import { start } from "repl";

const fetchKline = async (req: Request, res: Response): Promise<any> => {
  try {
    const symbol = req.query.symbol as string;
    const reqInterval = req.query.interval as string;

    // Ensure we handle timestamps in seconds (Unix)
    const startTime = parseInt(req.query.startTime as string);
    const endTime = parseInt(req.query.endTime as string);
    console.log("starttime------", startTime);
    console.log("endtime------", endTime);
    // Enforce a strict limit
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    // 1. Split "BTC_INR" -> base: "BTC", quote: "INR"
    const [baseAsset, quoteAsset] = symbol.split("_");

    if (!baseAsset || !quoteAsset) {
      return res
        .status(400)
        .json({ error: "Invalid symbol format. Use BASE_QUOTE." });
    }

    console.log(
      "start--------------",
      baseAsset,
      quoteAsset,
      reqInterval,
      limit
    );
    // 2. Map frontend interval to PostgreSQL interval
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

    // 3. The raw aggregation query matching your `candles` table
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

    console.log("result+++++++++++++++++++", result);

    // 4. Map the DB response to the exact shape the frontend ChartManager expects
    const formattedKlines = result
      .map((row) => ({
        // Convert DB timestamp back to JS millisecond integer
        end: new Date(row.bucket_time).getTime(),

        // Prisma Decimals/raw numerics need to be cast to string for the frontend
        open: row.open.toString(),
        high: row.high.toString(),
        low: row.low.toString(),
        close: row.close.toString(),
        volume: row.volume.toString(),
      }))
      .reverse(); // Reverse back to ASC chronological order for Lightweight Charts

    res.json(formattedKlines);
  } catch (error) {
    console.error("Error fetching klines via Prisma:", error);
    res.status(500).json({ error: "Failed to fetch klines" });
  }
};

export { fetchKline };
