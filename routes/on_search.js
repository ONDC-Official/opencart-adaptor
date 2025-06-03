import express from "express";
import onSearchHandler from "../handlers/onSearchHandler.js";
import onSearchMiddleware from "../middlewares/onSearchMiddleware.js";

const router = express.Router();
router.post("/on_search", onSearchMiddleware, onSearchHandler);

export default router;
