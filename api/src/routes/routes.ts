import express from "express";
import {
  getOrder,
  placeOrder,
  cancelOrder,
} from "../controller/order.controller";
import { registerUser, updateBalance } from "../controller/user.controller";
import { fetchKline } from "../controller/kline.controller";
import { fetchDepth, fetchTickerData } from "../controller/ticker.controller";
import { getTrades } from "../controller/trade.controller";
import { loginUser, logoutUser } from "../controller/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/auth/login", loginUser);
router.post("/auth/logout",authMiddleware, logoutUser);

router.post("/order", authMiddleware, placeOrder);
router.get("/order", authMiddleware, getOrder);
router.delete("/order", authMiddleware, cancelOrder);

router.get("/ticker", authMiddleware, fetchTickerData);
router.get("/depth", authMiddleware, fetchDepth);
router.get("/kline", authMiddleware, fetchKline);

router.post("/user", registerUser);
router.post("/balance", authMiddleware, updateBalance);

router.get("/trades", authMiddleware, getTrades);

export default router;
