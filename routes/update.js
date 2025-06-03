import express from 'express';
import updateMiddleware from '../middlewares/updateMiddleware.js';
import updateHandler from '../handlers/updateHandler.js';
import logger from '../utils/logger.js';

const updateRouter = express.Router();

updateRouter.post('/update', updateMiddleware, updateHandler);

export default updateRouter;
