import express from "express";
import { cancelOrder, placeOrder } from "../controller/order.controller";

const router = express.Router();

router.post("/order", placeOrder);
router.delete("/order", cancelOrder);

export default router;
