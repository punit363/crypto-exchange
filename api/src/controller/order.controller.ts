import { Request, Response } from "express";
import RedisHandler from "../redis";
import { generateOrderId } from "../utils";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

const placeOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { user_id, price, quantity, side, type, baseAsset, quoteAsset } = req.body;

    if (!user_id || !price || !quantity || !side || !type || !baseAsset || !quoteAsset) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const user = await prisma.user.findFirst({
      where: {
        user_id,
      },
    });

    if (!user) {
      return res.status(404).send({
        message: "User not found for the corresponding user_id",
      });
    }

    // if (side === "buy" && type === "limit") {
    //   const totalCost = new Prisma.Decimal(price).mul(quantity);

    //   if (user.balance.lessThan(totalCost)) {
    //     return res
    //       .status(400)
    //       .send({ error: "Insufficient balance for this order" });
    //   }

    //   await prisma.user.update({
    //     where: {
    //       user_id,
    //     },
    //     data: {
    //       balance: { decrement: new Prisma.Decimal(price).mul(quantity) },
    //       balance_lock: { increment: new Prisma.Decimal(price).mul(quantity) },
    //     },
    //   });
    // }

    // if (side === "sell" && type === "limit") {
    //   const holdings = await prisma.holding.findFirst({
    //     where: {
    //       user_id,
    //       asset_symbol: asset,
    //     },
    //   });

    //   if (!holdings) {
    //     return res.status(404).send({
    //       message: "You do not have any holdings for the specified asset",
    //     });
    //   }

    //   if (holdings.asset_balance.lessThan(quantity)) {
    //     return res
    //       .status(400)
    //       .send({ error: "Insufficient asset balance for the ask order" });
    //   }

    //   await prisma.holding.update({
    //     where: {
    //       user_id_asset_symbol: {
    //         user_id,
    //         asset_symbol: asset,
    //       },
    //     },
    //     data: {
    //       asset_balance: { decrement: quantity },
    //       asset_balance_lock: { increment: quantity },
    //     },
    //   });
    // }

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

    const order_response = (await redis.sendAndAwait({
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
    })) as OrderResponse;

    // if (order_response.fills.length > 0 && type === "limit") {
    //   //success order completed
    //   console.log(
    //     "limit order placed successfully with fills:",
    //     order_response.fills
    //   );
    //   //TODO: update the user balance and holdings based on the fills for the other user with whom the trade was executed
    //   if (side === "buy") {
    //     //decrement the balance_lock by the total cost of the fills
    //     console.log("--------------BUY ORDER---------------");
    //     await prisma.$transaction(async (tx) => {
    //       await tx.user.update({
    //         where: {
    //           user_id,
    //         },
    //         data: {
    //           balance_lock: {
    //             decrement: order_response.fills.reduce(
    //               (acc, fill) =>
    //                 acc.add(new Prisma.Decimal(fill.price).mul(fill.quantity)),
    //               new Prisma.Decimal(0) // ← initial value else it will start acc as a fill object
    //             ),
    //           },
    //         },
    //       });

    //       await tx.holding.upsert({
    //         where: {
    //           user_id_asset_symbol: {
    //             user_id,
    //             asset_symbol: asset,
    //           },
    //         },
    //         update: {
    //           asset_balance: {
    //             increment: order_response.fills.reduce(
    //               (acc, fill) => acc.add(fill.quantity),
    //               new Prisma.Decimal(0)
    //             ),
    //           },
    //         },
    //         create: {
    //           user_id,
    //           asset_symbol: asset,
    //           asset_balance: order_response.fills.reduce(
    //             (acc, fill) => acc.add(fill.quantity),
    //             new Prisma.Decimal(0)
    //           ),
    //         },
    //       });

    //       for (const [idx, fill] of order_response.fills.entries()) {
    //         await tx.holding.update({
    //           where: {
    //             user_id_asset_symbol: {
    //               user_id: fill.otherUserId,
    //               asset_symbol: asset,
    //             },
    //           },
    //           data: {
    //             asset_balance_lock: {
    //               decrement: fill.quantity,
    //             },
    //           },
    //         });

    //         await tx.user.update({
    //           where: {
    //             user_id: fill.otherUserId,
    //           },
    //           data: {
    //             balance: {
    //               increment: new Prisma.Decimal(fill.price).mul(fill.quantity),
    //             },
    //           },
    //         });
    //       }
    //     });
    //   } else if (side === "sell") {
    //     //decrement the asset_balance_lock by the total quantity of the fills
    //     console.log("--------------SELL ORDER---------------");
    //     await prisma.$transaction(async (tx) => {
    //       await tx.holding.update({
    //         where: {
    //           user_id_asset_symbol: {
    //             user_id,
    //             asset_symbol: asset,
    //           },
    //         },
    //         data: {
    //           asset_balance_lock: {
    //             decrement: order_response.fills.reduce(
    //               (acc, fill) => acc.add(fill.quantity),
    //               new Prisma.Decimal(0)
    //             ),
    //           },
    //         },
    //       });

    //       await tx.user.update({
    //         where: {
    //           user_id,
    //         },
    //         data: {
    //           balance: {
    //             increment: order_response.fills.reduce(
    //               (acc, fill) =>
    //                 acc.add(new Prisma.Decimal(fill.price).mul(fill.quantity)),
    //               new Prisma.Decimal(0) // ← initial value else it will start acc as a fill object
    //             ),
    //           },
    //         },
    //       });

    //       for (const [idx, fill] of order_response.fills.entries()) {
    //         await tx.user.update({
    //           where: {
    //             user_id: fill.otherUserId,
    //           },
    //           data: {
    //             balance_lock: {
    //               decrement: new Prisma.Decimal(fill.price).mul(fill.quantity),
    //             },
    //           },
    //         });

    //         await tx.holding.update({
    //           where: {
    //             user_id_asset_symbol: {
    //               user_id: fill.otherUserId,
    //               asset_symbol: asset,
    //             },
    //           },
    //           data: {
    //             asset_balance: {
    //               increment: new Prisma.Decimal(fill.quantity),
    //             },
    //           },
    //         });
    //       }
    //     });
    //   }
    // } else if (order_response.fills.length === 0 && type === "limit") {
    //   //no fills, order is placed in the order book
    //   //do nothing, the balance and holdings are already locked
    // }

    return res.send({ data: order_response });
  } catch (error) {
    console.error("Error in order/placeOrder:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const cancelOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { order_id, user_id } = req.body;

    if (!order_id) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const redis = await RedisHandler.createInstance();
    const order_response = await redis.sendAndAwait({
      action: "CANCEL_ORDER",
      user_id,
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
