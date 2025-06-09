import express from "express";
import { placeOrder } from "../controller/order.controller";

const router = express.Router();

router.post("/order", placeOrder);

export default router;
