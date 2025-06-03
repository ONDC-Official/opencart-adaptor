import express from "express";
import onIssueHandler from "../handlers/onIssueHandler.js";
import onIssueMiddleware from "../middlewares/onIssueMiddleware.js";

const router = express.Router();
router.post("/on_issue", onIssueMiddleware, onIssueHandler);

export default router;
