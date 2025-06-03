import express from "express";
import onSelectHandler from "../handlers/onSelectHandler.js";
import onSelectMiddleware from "../middlewares/onSelectMiddleware.js";

const router = express.Router();
router.post("/on_select", onSelectMiddleware, onSelectHandler);

export default router;
