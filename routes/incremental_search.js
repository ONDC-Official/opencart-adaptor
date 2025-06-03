import express from "express";
import incrementalSearchHandler from "../handlers/incrementalSearch.js";
import incrementalSearchMiddleware from "../middlewares/incrementalSearchMiddleware.js";

const router = express.Router();
router.post("/incremental-catalog-refresh", incrementalSearchMiddleware, incrementalSearchHandler);

export default router;
