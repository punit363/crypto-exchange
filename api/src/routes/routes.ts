import express from "express";
import { getOrder, placeOrder } from "../controller/order.controller";
import { registerUser, updateBalance } from "../controller/user.controller";
import { fetchKline } from "../controller/kline.controller";
import { fetchTickerData } from "../controller/ticker.controller";

const router = express.Router();

router.post("/order", placeOrder);
router.get("/order", getOrder);
router.get("/ticker", fetchTickerData);
router.post("/user", registerUser);
router.post("/balance", updateBalance);
router.get("/kline", fetchKline);

export default router;
