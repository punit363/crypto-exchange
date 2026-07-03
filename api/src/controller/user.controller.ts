import { Request, Response } from "express";
import { generateTransactionId, generateUserId } from "../utils";
import { UserData } from "../types/types";
import bcrypt from "bcrypt";
import { prisma } from "@exchange/db";
import RedisHandler from "../redis";

const registerUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstname, lastname, age, email, phone, password } = req.body;

    if (!firstname || !lastname || !age || !email || !phone || !password) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userdata: UserData = {
      user_id: generateUserId(),
      first_name: firstname,
      last_name: lastname,
      age: Number(age),
      email: email,
      phone: phone,
      password: hashedPassword,
    };

    const newUser = await prisma.user.create({
      data: userdata,
    });

    const { password: _, ...userWithoutPassword } = newUser;

    return res.send({ data: userWithoutPassword });
  } catch (error) {
    console.error("Error in order/registerUser:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const updateBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { user_id, amount, asset, type } = req.body;

    if (!user_id || !amount || !asset || !type) {
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

    const depositAmount = Number(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be a valid number greater than zero." });
    }

    const transaction = {
      tx_id: generateTransactionId(),
      user_id,
      asset,
      type,
      amount,
    };

    const redis = await RedisHandler.createInstance();
    const response = await redis.sendAndAwait({ type: "BALANCE", transaction });
    console.log("response--------------", response);
    res.status(200).json({
      message: "Balance added successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error in order/addBalance:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export { registerUser, updateBalance };
