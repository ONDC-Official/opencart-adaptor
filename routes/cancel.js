import express from "express";
import cancelMiddleware from '../middlewares/cancelMiddleware.js';
import cancelHandler from '../handlers/cancelHandler.js';
import logger from '../utils/logger.js';

const cancelRouter = express.Router();

cancelRouter.post('/cancel', cancelMiddleware, cancelHandler);

export default cancelRouter;