import express from "express";
import initHandler from "../handlers/InitHandler.js";
import initMiddleware from "../middlewares/initMiddleware.js";

const router = express.Router();
router.post("/init", initMiddleware, initHandler);

export default router;
