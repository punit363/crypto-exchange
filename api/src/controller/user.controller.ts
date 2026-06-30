import { Request, Response } from "express";
import { generateUserId } from "../utils";
import { UserData } from "../types/types";
import bcrypt from "bcrypt";
import { prisma } from "../prisma";

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

const addBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { user_id, amount } = req.body;

    if (!user_id || !amount) {
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

    const updatedUser = await prisma.user.update({
      where: {
        user_id: user_id,
      },
      data: {
        balance: {
          increment: depositAmount, // 👈 Prisma handles the math directly inside PostgreSQL!
        },
      },
    });

    res.status(200).json({
      message: "Balance added successfully",
      data: { new_balance: updatedUser.balance.toString() },
    });
  } catch (error) {
    console.error("Error in order/addBalance:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export { registerUser, addBalance };
