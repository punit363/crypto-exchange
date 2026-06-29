import express from "express";
import { cancelOrder, placeOrder } from "../controller/order.controller";
import { registerUser } from "../controller/user.controller";
const router = express.Router();

router.post("/order", placeOrder);
router.delete("/order", cancelOrder);
router.post("/user", registerUser);

export default router;
