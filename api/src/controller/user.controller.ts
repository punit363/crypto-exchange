import { Request, Response } from "express";
import { generateTransactionId, generateUserId } from "../utils";
import { EngineResponse, UserData } from "../types/types";
import bcrypt from "bcrypt";
import { prisma, UserRepo } from "@exchange/db";
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

    const user_id = generateUserId();

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userdata: UserData = {
      user_id,
      first_name: firstname,
      last_name: lastname,
      age: Number(age),
      email: email,
      phone: phone,
      password: hashedPassword,
    };

    const user = {
      user_id,
    };

    const redis = await RedisHandler.createInstance();
    const engine_response = (await redis.sendAndAwait({
      type: "USER",
      user,
    })) as EngineResponse;

    if (engine_response.eng_status_code === 0) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            engine_response.message,
            engine_response.status,
            engine_response.eng_status_code
          )
        );
    }

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
    console.error("Error in user/registerUser:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const updateBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount, asset, type } = req.body;
    const user_id = req.user_id;

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
      action: "UPDATE_BALANCE",
      user_id,
      transaction_data: { tx_id: generateTransactionId(), asset, type, amount },
    };

    const redis = await RedisHandler.createInstance();
    const engine_response = (await redis.sendAndAwait({
      type: "BALANCE",
      transaction,
    })) as EngineResponse;
    console.log(engine_response, "engine_response");
    if (!engine_response.data) {
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
    console.error("Error in user/updateBalance:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const fetchUserBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const user_id = req.user_id;

    if (!user_id) {
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

    const redis = await RedisHandler.createInstance();

    const engine_response = (await redis.sendAndAwait({
      type: "BALANCE",
      transaction: {
        action: "FETCH_BALANCE",
        user_id,
      },
    })) as EngineResponse;
    if (engine_response.eng_status_code === 0) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            engine_response.message,
            engine_response.status,
            engine_response.eng_status_code
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
    console.error("Error in user/fetchUserBalance:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const fetchAllAssets = async (req: Request, res: Response): Promise<any> => {
  try {
    const redis = await RedisHandler.createInstance();

    const engine_response = (await redis.sendAndAwait({
      type: "MARKET",
      market: {
        action: "FETCH_ALL_ASSET",
      },
    })) as EngineResponse;

    if (engine_response.eng_status_code === 0) {
      return res
        .status(400)
        .send(
          generateErrorResponse(
            engine_response.message,
            engine_response.status,
            engine_response.eng_status_code
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
    console.error("Error in user/fetchAllAssets:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

const fetchUserDetails = async (req: Request, res: Response): Promise<any> => {
  try {
    const user_id = req.user_id as string;

    const user_data = await UserRepo.findById(user_id);

    if (!user_data) {
      throw Error(`User data does not exist for User ID: ${user_id}`);
    }

    return res
      .status(200)
      .send(
        generateAPIResponse(
          user_data,
          `User data found for User ID: ${user_id}`,
          "SUCCESS",
          1
        )
      );
  } catch (error) {
    console.error("Error in user/fetchUserDetail:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export {
  registerUser,
  updateBalance,
  fetchUserBalance,
  fetchAllAssets,
  fetchUserDetails,
};
