import express from "express";
import onInitHandler from "../handlers/onInitHandler.js";
import onInitMiddleware from "../middlewares/onInitMiddleware.js";

const router = express.Router();
router.post("/on_init", onInitMiddleware, onInitHandler);

export default router;
