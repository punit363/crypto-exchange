import { Request, Response } from "express";
import RedisHandler from "../redis";
import { generateOrderId } from "../utils";
import { generateAPIResponse, generateErrorResponse } from "../helper";
import { EngineResponse } from "../types/types";

const placeOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { price, quantity, side, type, baseAsset, quoteAsset } = req.body;

    const user_id = req.user_id as string;
    if (
      !user_id ||
      !price ||
      !quantity ||
      !side ||
      !type ||
      !baseAsset ||
      !quoteAsset
    ) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Required fields are missing from the request",
            "FAILED",
            0
          )
        );
    }

    const order_id = generateOrderId();
    const redis = await RedisHandler.createInstance();
    type OrderResponse = {
      order_id: string;
      fills: {
        price: number;
        quantity: number;
        tradeId: string;
        userId: string;
        otherUserId: string;
      }[];
      unsold_market_order_quanity: number;
      unused_market_order_amount: number;
    };

    const engine_response = (await redis.sendAndAwait({
      type: "ORDER",
      order: {
        action: "PLACE_ORDER",
        user_id,
        order_data: {
          order_id,
          price,
          quantity,
          side,
          type,
          baseAsset,
          quoteAsset,
        },
      },
    })) as EngineResponse;

    if (!engine_response.data) {
      return res
        .status(400)
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
    console.error("Error in order/placeOrder:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const getOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const user_id = req.user_id as string;
    const market = req.query.market as string;
    const type = req.query.type as "open" | "history";

    if (!user_id || !market || !type) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Required parameters are missing from request",
            "FAILED",
            0
          )
        );
    }

    const [baseAsset, quoteAsset] = market.split("_");

    const redis = await RedisHandler.createInstance();
    const engine_response = (await redis.sendAndAwait({
      type: "ORDER",
      order: {
        action: "FETCH_OPEN_ORDERS",
        user_id,
        order_data: {
          baseAsset,
          quoteAsset,
        },
      },
    })) as EngineResponse;

    if (!engine_response.data || engine_response.data.length <= 0) {
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
    console.error("Failed to fetch orders:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const cancelOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { order_id, side, base_asset, quote_asset } = req.body;
    const user_id = req.user_id as string;
    
    if (!order_id) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Required request parameters are missing from request",
            "FAILED",
            0
          )
        );
    }

    const redis = await RedisHandler.createInstance();

    const engine_response = (await redis.sendAndAwait({
      type: "ORDER",
      order: {
        user_id,
        action: "CANCEL_ORDER",
        order_data: {
          order_id,
          side,
          baseAsset: base_asset,
          quoteAsset: quote_asset,
        },
      },
    })) as EngineResponse;

    if (!engine_response.data) {
      return res
        .status(400)
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
    console.error("Error in order/cancelOrder:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export { placeOrder, getOrder, cancelOrder };
