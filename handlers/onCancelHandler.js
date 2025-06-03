import logger from "../utils/logger.js";
import { sendAck } from "../utils/sendResponse.js";
import { getValue, setValue } from "../utils/cache.js";

const onCancelHandler = async (req, res) => {
  const { body } = req;
  const context = body.context || {};
  const message = body.message || {};
  const transactionId = context.transaction_id;
  const messageId = context.message_id;

  const orderId = message.order?.id;

  const ackResponse = sendAck({
    transaction_id: transactionId,
    message_id: messageId,
    action: "on_cancel",
    timestamp: new Date().toISOString()
  });

  const cacheKey = `on_cancel_ack:${transactionId}:${messageId}`;

  try {
    const cachedAck = await getValue(cacheKey);
    if (cachedAck) {
      logger.warn({ message: "Duplicate /on_cancel received. Sending cached ACK.", transactionId, messageId });
      return res.status(200).json(ackResponse);
    }

    if (!orderId) {
      logger.error({ message: "Missing order ID in on_cancel payload", transactionId });
      return res.status(400).json({
        message: { ack: { status: "NACK" } },
        error: { code: "40000", message: "Missing order.id in message" }
      });
    }

    logger.info({ message: "Received /on_cancel", orderId, transactionId });

    res.status(200).json(ackResponse);
    await setValue(cacheKey, true, 3600);
  } catch (error) {
    logger.error({ message: "Error processing on_cancel", error: error.message, transactionId });
    res.status(500).json({
      message: { ack: { status: "NACK" } },
      error: { code: "50000", message: error.message }
    });
  }
};

export default onCancelHandler;