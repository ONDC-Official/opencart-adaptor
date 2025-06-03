import express from "express";
import statusMiddleware from "../middlewares/statusMiddleware.js";

import statusHandler from "../handlers/statusHandler.js";

const statusRouter = express.Router();

statusRouter.post("/status", statusMiddleware, statusHandler);

export default statusRouter;
