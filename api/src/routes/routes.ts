import express from "express";
import { getOrder, placeOrder,getOpenOrder } from "../controller/order.controller";
import { registerUser, updateBalance } from "../controller/user.controller";
import { fetchKline } from "../controller/kline.controller";
import { fetchDepth, fetchTickerData } from "../controller/ticker.controller";
import { getTrades } from "../controller/trade.controller";

const router = express.Router();

router.post("/order", placeOrder);
router.get("/order", getOrder);
router.get("/order/open", getOpenOrder);

router.get("/ticker", fetchTickerData);
router.get("/depth", fetchDepth);
router.get("/kline", fetchKline);

router.post("/user", registerUser);
router.post("/balance", updateBalance);

router.get("/trades", getTrades);

export default router;
