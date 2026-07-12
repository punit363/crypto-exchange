import { prisma, UserRepo } from "@exchange/db";
import { Request, Response } from "express";
import { generateAPIResponse, generateErrorResponse } from "../helper";
import bcrypt from "bcryptjs";

const loginUser = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("---------------");
    const { user_id, email, password } = req.body;
    console.log(user_id, email, password, "---------------");
    if (!(user_id || email) || !password) {
      return res
        .status(400)
        .send(
          generateErrorResponse("Login credential are missing.", "FAILED", 0)
        );
    }

    let user;
    if (user_id) {
      user = await UserRepo.findById(user_id);
    } else if (email) {
      user = await UserRepo.findByEmail(email);
    }

    if (!user) {
      return res
        .status(404)
        .send(
          generateErrorResponse(
            "User not found for this email/user_id",
            "FAILED",
            0
          )
        );
    }

    const is_password_correct = await bcrypt.compare(password, user.password);

    if (!is_password_correct) {
      return res
        .status(404)
        .send(generateErrorResponse("Incorrect Password", "FAILED", 0));
    }

    return res.status(200).send(
      generateAPIResponse(
        {
          user_id,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          age: user.age,
        },
        "User LoggedIn successfully",
        "SUCCESS",
        1
      )
    );
  } catch (error) {
    console.error("Error fetching klines via Prisma:", error);
    res.status(500).json({ error: "Failed to fetch klines" });
  }
};

export { loginUser };
