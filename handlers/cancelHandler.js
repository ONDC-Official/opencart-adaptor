import mysql from "mysql2/promise";
import axios from "axios";
import logger from "../utils/logger.js";
import { sendAck } from "../utils/sendResponse.js";
import { getValue, setValue } from "../utils/cache.js";
import { signRequest } from "../auth/cryptoUtils.js";
import { fetchOrderMetaForCancel } from "../services/fetchOrderMeta.js";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

// const OPENCART_CANCELED_STATUS_ID = parseInt(process.env.OPENCART_CANCELLED_STATUS_ID || '7');
const OPENCART_CANCELED_STATUS_ID = parseInt('7');


const cancelHandler = async (req, res) => {
  const { body } = req;
  const context = body.context || {};
  const message = body.message || {};
  const transactionId = context.transaction_id;
  const messageId = context.message_id;
  // const orderId = message.order?.id;
  const orderId = message.order_id;
  const cancellation = message.order?.cancellation || {};

  const ackResponse = sendAck({
    transaction_id: transactionId,
    message_id: messageId,
    action: "cancel",
    timestamp: new Date().toISOString()
  });

  const cacheKey = `cancel_ack:${transactionId}:${messageId}`;

  try {
    const cachedAck = await getValue(cacheKey);
    if (cachedAck) {
      logger.warn({ message: "Duplicate /cancel received. Sending cached ACK.", transactionId, messageId });
      return res.status(200).json(ackResponse);
    }
  } catch (err) {
    logger.error({ message: "Error reading ACK cache", err: err.message });
  }

  res.status(200).json(ackResponse);

  setImmediate(async () => {
    let connection;
    try {
      if (!orderId) {
        logger.error({ message: "Missing order ID in cancel payload", transactionId });
        return;
      }

      logger.info({ message: "Processing cancellation", transactionId, orderId });

      connection = await mysql.createConnection(dbConfig);
      await connection.execute(`UPDATE oc_order SET order_status_id = ? WHERE order_id = ?`, [OPENCART_CANCELED_STATUS_ID, orderId]);
      await connection.execute(
        `INSERT INTO oc_order_history (order_id, order_status_id, notify, comment, date_added)
         VALUES (?, ?, ?, ?, NOW())`,
        [orderId, OPENCART_CANCELED_STATUS_ID, 0, `Cancellation reason: ${cancellation?.reason?.id || 'Unknown'}`]
      );
      await connection.end();

      const orderMeta = await fetchOrderMetaForCancel(orderId);
      

      const onCancelResponse = {
        context: {
          ...context,
          action: "on_cancel",
          bpp_id: context?.bpp_id,
          bpp_uri: context?.bpp_uri,
          timestamp: new Date().toISOString()
        },
        message: {
          order: {
            id: orderMeta.id,
            state: "Cancelled",
            provider: orderMeta.provider,
            billing: orderMeta.billing,
            items: orderMeta.items,
            cancellation: cancellation,
            fulfillments: orderMeta.fulfillments,
            quote: orderMeta.quote,
            cancellation: orderMeta.cancellation,
            payment: orderMeta.payment,
            
          }
        }
      };

      const { signature, digest, authHeader } = signRequest(onCancelResponse);
      const callbackUrl = `${context.bap_uri}/on_cancel`;

      const response = await axios.post(callbackUrl, onCancelResponse, {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          Digest: digest,
          Signature: signature,
          "x-dev-mode": "true"
        }
      });

      logger.info({
        message: "Sent /on_cancel to BAP",
        status: response.status,
        data: response.data
      });
      await setValue(cacheKey, true, 3600);
    } catch (error) {
      logger.error({ message: "Error processing cancellation or sending /on_cancel", error: error.message });
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          logger.error({ message: "Error closing DB connection", error: err.message });
        }
      }
    }
  });
};

export default cancelHandler;
