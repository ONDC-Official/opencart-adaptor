import express from "express";
import onIssueStatusHandler from "../handlers/onIssueStatus.js";
import onIssueStatusMiddleware from "../middlewares/onIssueStatusMiddleware.js";

const router = express.Router();
router.post("/on_issue_status", onIssueStatusMiddleware, onIssueStatusHandler);

export default router;
