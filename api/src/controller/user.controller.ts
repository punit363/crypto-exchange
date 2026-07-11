import { Request, Response } from "express";
import { generateTransactionId, generateUserId } from "../utils";
import { UserData } from "../types/types";
import bcrypt from "bcrypt";
import { prisma } from "@exchange/db";
import RedisHandler from "../redis";
import { generateAPIResponse, generateErrorResponse } from "../helper";

const registerUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstname, lastname, age, email, phone, password } = req.body;

    if (!firstname || !lastname || !age || !email || !phone || !password) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "Missing required fields from request",
            "FAILED",
            0
          )
        );
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

    const newUser = (await prisma.user.create({
      data: userdata,
    })) as UserData;

    if (!newUser) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "Error creating user. Please try again",
            "FAILED",
            0
          )
        );
    }

    const { password: _, ...userWithoutPassword } = newUser;

    return res
      .status(200)
      .send(
        generateAPIResponse(
          userWithoutPassword,
          "User registered successfully",
          "SUCCESS",
          1
        )
      );
  } catch (error) {
    console.error("Error in order/registerUser:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const updateBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { user_id, amount, asset, type } = req.body;

    if (!user_id || !amount || !asset || !type) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Missing required fields from request",
            "FAILED",
            0
          )
        );
    }

    const user = await prisma.user.findFirst({
      where: {
        user_id,
      },
    });

    if (!user) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "User not found for the corresponding User ID",
            "FAILED",
            0
          )
        );
    }

    const depositAmount = Number(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            "Amount must be a valid number greater than zero",
            "FAILED",
            0
          )
        );
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

    if (!response) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "Transaction Failed. Please recheck balance and try again",
            "FAILED",
            0
          )
        );
    }

    return res
      .status(200)
      .send(
        generateAPIResponse(
          response,
          "User Balance updated successfully",
          "SUCCESS",
          1
        )
      );
  } catch (error) {
    console.error("Error in order/addBalance:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export { registerUser, updateBalance };
