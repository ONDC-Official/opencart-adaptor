import express from "express";
import issueStatusHandler from "../handlers/issueStatus.js";
import issueStatusMiddleware from "../middlewares/issueStatusMiddleware.js";

const router = express.Router();
router.post("/issue_status", issueStatusMiddleware, issueStatusHandler);

export default router;
