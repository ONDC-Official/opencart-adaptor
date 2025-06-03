import express from "express";
import on_IncrementalSearchHandler from "../handlers/on_incrementalSearch.js";
import on_IncrementalSearchMiddleware from "../middlewares/on_incrementalSearchMiddleware.js";

const router = express.Router();
router.post("/on-incremental-catalog-refresh", on_IncrementalSearchMiddleware, on_IncrementalSearchHandler);

export default router;
