import mysql from "mysql2/promise";
import axios from "axios";
import { signRequest } from "../auth/cryptoUtils.js";
import { getValue, setValue } from "../utils/cache.js";
import { sendAck } from "../utils/sendResponse.js";
import logger from "../utils/logger.js";
import { fetchOrderMetaForStatus } from "../services/fetchOrderMeta.js"; 

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const ONDC_TO_OPENCART_STATUS_MAP = {
  "Pending": 1,
  "Packed": 2,
  "Out-for-pickup": 15,
  "Pickup-failed": 10,
  "Agent-assigned": 2,
  "Order-picked-up": 3,
  "Out-for-delivery": 3,
  "Order-delivered": 5,
  "Delivery-failed": 10,
  "Cancelled": 7,
};

const statusHandler = async (req, res) => {
  const { body } = req;
  const context = body.context || {};
  const message = body.message || {};
  const transactionId = context.transaction_id;
  const messageId = context.message_id;
  const order = message.order || {};
  const orderId = order.id || message.order_id;
  const fulfillment = order.fulfillments?.[0];
  const fulfillmentState = fulfillment?.state?.descriptor?.code || message.order_status_id;

  const ackResponse = sendAck({
    transaction_id: transactionId,
    message_id: messageId,
    action: "status",
    timestamp: new Date().toISOString(),
  });

  const cacheKey = `status_ack:${transactionId}:${messageId}`;

  try {
    const cachedAck = await getValue(cacheKey);
    if (cachedAck) {
      logger.warn({ message: "Duplicate /status received. Sending cached ACK.", transactionId, messageId });
      return res.status(200).json(ackResponse);
    }
  } catch (err) {
    logger.error({ message: "Error reading ACK cache", err: err.message });
  }

  res.status(200).json(ackResponse);

  setImmediate(async () => {
    let connection;
    try {
      if (!orderId || !fulfillmentState) {
        logger.error({ message: "Missing order ID or fulfillment state", transactionId });
        return;
      }

      logger.info({ message: "Processing status update", transactionId, orderId, fulfillmentState });

      const newStatusId = ONDC_TO_OPENCART_STATUS_MAP[fulfillmentState];
      if (!newStatusId) {
        logger.warn({ message: `Unknown fulfillment state: ${fulfillmentState}. No mapping available.`, transactionId });
        return;
      }

      connection = await mysql.createConnection(dbConfig);
      await connection.execute(`UPDATE oc_order SET order_status_id = ? WHERE order_id = ?`, [newStatusId, orderId]);

      await connection.execute(
        `INSERT INTO oc_order_history (order_id, order_status_id, notify, comment, date_added)
         VALUES (?, ?, ?, ?, NOW())`,
        [orderId, newStatusId, 0, `Updated from ONDC: ${fulfillmentState}`]
      );

      await connection.end();

      const orderMeta = await fetchOrderMetaForStatus(orderId);

      const onStatusResponse = {
        context: {
          ...context,
          action: "on_status",
          bpp_id: context?.bpp_id,
          bpp_uri: context?.bpp_uri,
          timestamp: new Date().toISOString()
        },
        message: {
          order: {
            id: orderMeta.id,
            state: fulfillmentState,
            provider: orderMeta.provider,
            billing: orderMeta.billing,
            items: orderMeta.items,
            fulfillments: orderMeta.fulfillments,
            quote: orderMeta.quote
          }
        }
      };

      const { signature, digest, authHeader } = signRequest(onStatusResponse);
      const callbackUrl = `${context.bap_uri}/on_status`;

      const response = await axios.post(callbackUrl, onStatusResponse, {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          Digest: digest,
          Signature: signature,
          "x-dev-mode": "true"
        }
      });

      logger.info({
        message: "Sent /on_status to BAP",
        status: response.status,
        data: response.data
      });

      await setValue(cacheKey, true, 3600);
    } catch (error) {
      logger.error({ message: "Error processing status or sending /on_status", error: error.message });
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

export default statusHandler;
