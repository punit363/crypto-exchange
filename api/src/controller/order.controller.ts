import { Request, Response } from "express";
import RedisHandler from "../redis";
import { generateOrderId } from "../utils";

const placeOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { price, quantity, side } = req.body;

    if (!price || !quantity || !side) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const order_id = generateOrderId();
    const redis = await RedisHandler.createInstance();
    const order_response = await redis.sendAndAwait({
      action: "PLACE_ORDER",
      order_data: {
        order_id,
        price,
        quantity,
        side,
      },
    });

    return res.send({ data: order_response });
  } catch (error) {
    console.error("Error in order/placeOrder:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const cancelOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const redis = await RedisHandler.createInstance();
    const order_response = await redis.sendAndAwait({
      action: "CANCEL_ORDER",
      order_data: {
        order_id,
      },
    });

    console.log(order_response, "Order response");
    return res.send({ data: order_response });
  } catch (error) {
    console.error("Error in order/cancelOrder:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export { placeOrder, cancelOrder };
