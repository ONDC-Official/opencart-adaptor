// /routes/onStatusRouter.js

import express from "express";
import { processOnStatusRequest } from "../middlewares/onStatusMiddleware.js";
import onStatusHandler from "../handlers/onStatusHandler.js";

const onStatusRouter = express.Router();

// Route for ONDC /on_status (BPP → BAP)
onStatusRouter.post("/on_status", processOnStatusRequest, onStatusHandler);

export default onStatusRouter;
