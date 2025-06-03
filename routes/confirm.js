import express from 'express';
import confirmMiddleware from '../middlewares/confirmMiddleware.js';
import confirmHandler from '../handlers/confirmHandler.js'; 

const confirmRouter = express.Router();

confirmRouter.post('/confirm', confirmMiddleware, confirmHandler); 

export default confirmRouter;
