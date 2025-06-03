import dotenv from 'dotenv';
dotenv.config();

const onCancelMiddleware = (req, res, next) => {
    const { context, message, error } = req.body || {};

    if (!context || !context.transaction_id) {
        console.error('Validation Error: Missing context or context.transaction_id in /on_cancel request');
        return res.status(400).json({
            context: context || {},
            error: {
                type: "CONTEXT-ERROR",
                code: "30001",
                message: "Missing context or context.transaction_id",
            },
        });
    }

    if (!message && !error) {
        console.error(`Validation Error: Request must have either message or error object. Transaction ID: ${context.transaction_id}`);
        return res.status(400).json({
            context: context,
            error: {
                type: "JSON-SCHEMA-ERROR",
                code: "30001",
                message: "Request must have either a message or an error object",
            },
        });
    }

    req.context = req.body?.context || {};
    req.transactionId = req.context?.transaction_id;

    next();
};

export default onCancelMiddleware;
