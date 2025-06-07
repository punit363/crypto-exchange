import { Router } from "express";
import { placeOrder } from "../controller/order.controller";

const router = Router();

router.post("/order", placeOrder);

export { router };
