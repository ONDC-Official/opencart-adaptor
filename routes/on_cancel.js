import express from 'express';
import onCancelMiddleware from '../middlewares/onCancelMiddleware.js'; 
import OnCancelHandler from '../handlers/onCancelHandler.js';

const onCancelRouter = express.Router();

onCancelRouter.post('/on_cancel', onCancelMiddleware, OnCancelHandler);

export default onCancelRouter;
