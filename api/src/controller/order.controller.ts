import { getOrderResponse, pushOrderToQueue } from "../redis";
import { generateOrderId } from "../utils";

const placeOrder = async (req: any, res: any) => {
  try {
    const { baseAsset, quoteAsset, price, quantity, side, type, kind } =
      req.body;

    const order_id = generateOrderId();
    await pushOrderToQueue({ order_id, price, quantity, side });

    const order_response = await getOrderResponse(order_id);

    res.send({
      data: order_response,
    });
  } catch (error) {
    console.log(error, "error in order/placeOrder");
  }
};

export { placeOrder };
