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

export { registerUser };
