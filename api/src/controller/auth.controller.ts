import { UserRepo } from "@exchange/db";
import { Request, Response } from "express";
import { generateAPIResponse, generateErrorResponse } from "../helper";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.utils";
import { JwtPayload } from "jsonwebtoken";

const loginUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { user_id, email, password } = req.body;

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
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: process.env.ACCESS_COOKIE_AGE
        ? parseInt(process.env.ACCESS_COOKIE_AGE, 10)
        : 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: process.env.REFRESH_COOKIE_AGE
        ? parseInt(process.env.REFRESH_COOKIE_AGE, 10)
        : 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const user_data = {
      user_id: user.user_id,
      email: user.email,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      age: user.age,
    };

    console.log(user_data, "________________");

    return res
      .status(200)
      .send(
        generateAPIResponse(
          user_data,
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

const logoutUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const user_id = req.user_id;

    if (!user_id) {
      return res
        .status(400)
        .send(generateErrorResponse("User ID is missing.", "FAILED", 0));
    }

    await UserRepo.updateRefreshToken(user_id, "");

    return res
      .status(200)
      .send(
        generateAPIResponse({}, "User Logged Out successfully", "SUCCESS", 1)
      );
  } catch (error) {
    console.error("Error with User Logout:", error);
    res.status(500).json({ error: "Failed to Logout" });
  }
};

const refreshTokens = async (req: Request, res: Response): Promise<any> => {
  try {
    let refreshToken: string | undefined = undefined;
    const refreshAuthHeader = req.headers.refresh_token as string;

    if (refreshAuthHeader && refreshAuthHeader.startsWith("Bearer ")) {
      refreshToken = refreshAuthHeader.split(" ")[1];
    } else if (req.cookies?.refresh_token) {
      refreshToken = req.cookies.refresh_token;
    } else if (req.body?.refreshToken || req.body?.refresh_token) {
      refreshToken = req.body.refreshToken || req.body.refresh_token;
    }

    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized: missing refresh token" });
    }

    try {
      const refreshPayload = verifyRefreshToken(refreshToken) as JwtPayload;

      if (!refreshPayload.user_id) {
        return res
          .status(401)
          .json({ message: "Unauthorized: invalid refresh token payload" });
      }

      const dbUser = await UserRepo.fetchRefreshToken(refreshToken);

      if (!dbUser || dbUser.refresh_token !== refreshToken) {
        console.warn(
          `[SECURITY ALARM] Replay attack detected for UID: ${refreshPayload.user_id}. Revoking family.`
        );

        if (refreshPayload.user_id) {
          await UserRepo.updateRefreshToken(refreshPayload.user_id, "");
        }

        res.clearCookie("access_token");
        res.clearCookie("refresh_token");

        return res.status(401).json({
          message:
            "Security alert: Compromised session detected. Please log in again.",
        });
      }

      const access_token = generateAccessToken(refreshPayload.user_id);
      const refresh_token = generateRefreshToken(refreshPayload.user_id);

      await UserRepo.updateRefreshToken(refreshPayload.user_id, refresh_token);

      const isProduction = process.env.NODE_ENV === "production";

      res.cookie("access_token", access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: process.env.ACCESS_COOKIE_AGE
          ? parseInt(process.env.ACCESS_COOKIE_AGE, 10)
          : 15 * 60 * 1000,
        path: "/",
      });

      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: process.env.REFRESH_COOKIE_AGE
          ? parseInt(process.env.REFRESH_COOKIE_AGE, 10)
          : 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.status(200).send(
        generateAPIResponse(
          {
            access_token,
            refresh_token,
            accessToken: access_token,
            refreshToken: refresh_token,
            user_id: refreshPayload.user_id,
          },
          "Tokens refreshed successfully",
          "SUCCESS",
          1
        )
      );
    } catch (refreshErr: any) {
      if (refreshErr.message === "Token has expired") {
        return res
          .status(401)
          .json({ message: "Session expired: please log in again" });
      }
      return res
        .status(401)
        .json({ message: "Unauthorized: invalid refresh token" });
    }
  } catch (error) {
    console.error("Error with Token Refresh Handshake:", error);
    return res.status(500).json({ error: "Failed to Refresh" });
  }
};

export { loginUser, logoutUser, refreshTokens };
