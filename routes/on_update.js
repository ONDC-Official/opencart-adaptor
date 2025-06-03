import express from 'express';
import onUpdateMiddleware from '../middlewares/onUpdateMiddleware.js';
import logger from '../utils/logger.js';

const onUpdateRouter = express.Router();

// POST /on_update
onUpdateRouter.post("/on_update", onUpdateMiddleware, async (req, res) => {
    const transactionId = req.body?.context?.transaction_id;
    const messageId = req.body?.context?.message_id;
    const snpId = req.verified_snp_id;

    try {
        logger.info({
            message: "Processing /on_update payload",
            snpId,
            transactionId,
            messageId,
            payload: req.body,
        });

        res.status(200).json({
            message: "on_update processed successfully",
        });
    } catch (error) {
        logger.error({
            message: "Error processing /on_update",
            error: error.message,
            stack: error.stack,
            transactionId,
            messageId,
        });
        res.status(500).json({
            error: "Failed to process /on_update",
        });
    }
});

export default onUpdateRouter;
