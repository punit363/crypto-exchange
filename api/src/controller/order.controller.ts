import { Request, Response } from "express";
import RedisHandler from "../redis";
import { generateOrderId } from "../utils";

const placeOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { price, quantity, side } = req.body;

    // Basic validation
    if (!price || !quantity || !side) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const order_id = generateOrderId();
    const redis = await RedisHandler.createInstance();
    const order_response = await redis.sendAndAwait({
      order_id,
      price,
      quantity,
      side,
    });

    console.log(order_response, "Order response");
    return res.send({ data: order_response });
  } catch (error) {
    console.error("Error in order/placeOrder:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export { placeOrder };
