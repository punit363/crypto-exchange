import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, verifyRefreshToken } from "../utils/auth.utils.js";
import { UserRepo } from "@exchange/db";
import { JwtPayload } from "jsonwebtoken";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessAuthHeader = req.headers.access_token as string;

    if (!accessAuthHeader || !accessAuthHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: missing access token" });
      return;
    }

    const accessToken = accessAuthHeader.split(" ")[1];

    try {
      const payload = verifyAccessToken(accessToken) as JwtPayload;
      console.log("Access token payload:", payload);
      if (!payload.user_id) {
        res
          .status(401)
          .json({ message: "Unauthorized: invalid token payload" });
        return;
      }

      req.body.user_id = payload.user_id;
      next();
    } catch (accessErr: any) {
      if (accessErr.message !== "Token has expired") {
        res.status(401).json({ message: "Unauthorized: invalid access token" });
        return;
      }

      const refreshAuthHeader = req.headers.refresh_token as string;

      if (!refreshAuthHeader || !refreshAuthHeader.startsWith("Bearer ")) {
        res
          .status(401)
          .json({ message: "Unauthorized: missing refresh token" });
        return;
      }

      const refreshToken = refreshAuthHeader.split(" ")[1];

      try {
        const refreshPayload = verifyRefreshToken(refreshToken) as JwtPayload;
        console.log("Refresh token payload:", refreshPayload);
        if (!refreshPayload.user_id) {
          res
            .status(401)
            .json({ message: "Unauthorized: invalid refresh token payload" });
          return;
        }

        const dbUser = await UserRepo.fetchRefreshToken(refreshToken);
        console.log("DB user fetched for refresh token:", dbUser);
        if (!dbUser || dbUser.refresh_token !== refreshToken) {
          res
            .status(401)
            .json({ message: "Unauthorized: refresh token revoked" });
          return;
        }

        req.body.user_id = refreshPayload.user_id;
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
