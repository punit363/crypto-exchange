import { UserRepo } from "@exchange/db";
import { Request, Response } from "express";
import { generateAPIResponse, generateErrorResponse } from "../helper";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../utils/auth.utils";

const loginUser = async (req: Request, res: Response): Promise<any> => {
  try {
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



    const access_token = generateAccessToken(user.user_id);
    const refresh_token = generateRefreshToken(user.user_id);

    await UserRepo.updateRefreshToken(user.user_id, refresh_token);

    return res.status(200).send(
      generateAPIResponse(
        {
          user_id,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          age: user.age,
          access_token,
          refresh_token,
        },
        "User LoggedIn successfully",
        "SUCCESS",
        1
      )
    );
  } catch (error) {
    console.error("Error with User Login:", error);
    res.status(500).json({ error: "Failed to Login" });
  }
};

export { loginUser };
