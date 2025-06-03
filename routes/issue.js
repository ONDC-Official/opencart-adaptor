import express from "express";
import issueHandler from "../handlers/issueHandler.js";
import issueMiddleware from "../middlewares/issueMiddleware.js";

const router = express.Router();
router.post("/issue", issueMiddleware, issueHandler);

export default router;
