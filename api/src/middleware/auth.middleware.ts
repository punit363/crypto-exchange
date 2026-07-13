import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, verifyRefreshToken } from "../utils/auth.utils.js";
import { UserRepo } from "@exchange/db";
import { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    user_id?: string;
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Defensively retrieve Access Token from Headers OR Cookies
    let accessToken: string | undefined = undefined;
    const accessAuthHeader = req.headers.access_token as string;

    if (accessAuthHeader && accessAuthHeader.startsWith("Bearer ")) {
      accessToken = accessAuthHeader.split(" ")[1];
    } else if (req.cookies?.access_token) {
      accessToken = req.cookies.access_token;
    }

    if (!accessToken) {
      res.status(401).json({ message: "Unauthorized: missing access token" });
      return;
    }

    try {
      // 2. Verify Access Token
      const payload = verifyAccessToken(accessToken) as JwtPayload;

      if (!payload.user_id) {
        res
          .status(401)
          .json({ message: "Unauthorized: invalid token payload" });
        return;
      }

      req.user_id = payload.user_id;
      next();
    } catch (accessErr: any) {
      console.log(accessErr.message, "accessErr.message");
      if (accessErr.message !== "Token has expired") {
        res.status(401).json({ message: "Unauthorized: invalid access token" });
        return;
      }

      // 3. Defensively retrieve Refresh Token from Headers OR Cookies
      let refreshToken: string | undefined = undefined;
      const refreshAuthHeader = req.headers.refresh_token as string;

      if (refreshAuthHeader && refreshAuthHeader.startsWith("Bearer ")) {
        refreshToken = refreshAuthHeader.split(" ")[1];
      } else if (req.cookies?.refresh_token) {
        refreshToken = req.cookies.refresh_token;
      }

      if (!refreshToken) {
        res
          .status(401)
          .json({ message: "Unauthorized: missing refresh token" });
        return;
      }

      try {
        // 4. Verify Refresh Token
        const refreshPayload = verifyRefreshToken(refreshToken) as JwtPayload;

        if (!refreshPayload.user_id) {
          res
            .status(401)
            .json({ message: "Unauthorized: invalid refresh token payload" });
          return;
        }

        const dbUser = await UserRepo.fetchRefreshToken(refreshToken);

        if (!dbUser || dbUser.refresh_token !== refreshToken) {
          res
            .status(401)
            .json({ message: "Unauthorized: refresh token revoked" });
          return;
        }

        req.user_id = refreshPayload.user_id;
        next();
      } catch (refreshErr: any) {
        if (refreshErr.message === "Token has expired") {
          res
            .status(401)
            .json({ message: "Session expired: please log in again" });
          return;
        }
        res
          .status(401)
          .json({ message: "Unauthorized: invalid refresh token" });
      }
    }
  } catch (error) {
    next(error);
  }
};
