import express from 'express';
const onConfirmRouter = express.Router();

import onConfirmHandler from '../handlers/onconfirmHandler.js';

import onConfirmMiddleware from '../middlewares/onconfirmMiddleware.js';

// Set the route to match the API endpoint
onConfirmRouter.post('/on_confirm', onConfirmMiddleware, onConfirmHandler);

export default onConfirmRouter;
