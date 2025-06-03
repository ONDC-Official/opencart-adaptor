import _ from "lodash";
import mysql from "mysql2/promise";
import axios from "axios";
import logger from "../utils/logger.js";
import { sendAck } from "../utils/sendResponse.js";
import { getValue, setValue } from "../utils/cache.js";
import { signRequest } from "../auth/cryptoUtils.js";
import { fetchOrderMetaForUpdate } from "../services/fetchOrderMetaForUpdate.js";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};


const handleItemUpdate = async (orderId, fulfillments, transactionId) => {
  const connection = await mysql.createConnection(dbConfig);
  for (const fulfillment of fulfillments) {
    const returnTags = fulfillment.tags?.find(t => t.code === "return_request")?.list || [];
    const itemIdTag = returnTags.find(t => t.code === "item_id");
    const returnReasonTag = returnTags.find(t => t.code === "RETURN_REASON");
    const returnCommentTag = returnTags.find(t => t.code === "RETURN_COMMENT");
    const itemId = fulfillment.items?.[0]?.id || itemIdTag?.value;
    const cancelReason = returnReasonTag?.value || "Not provided";
    const comment = returnCommentTag?.value || "";
    const [[reasonRow]] = await connection.execute(
      `SELECT return_reason_id FROM oc_return_reason WHERE name = ? LIMIT 1`,
      [cancelReason]
    );
    const [[productDetails]] = await connection.execute(
      `SELECT name, model FROM oc_order_product WHERE order_id = ? AND product_id = ? LIMIT 1`,
      [orderId, itemId]
    );
    
    const [[customerDetails]] = await connection.execute(
      `SELECT firstname, lastname, email, telephone FROM oc_order WHERE order_id = ? LIMIT 1`,
      [orderId]
    );
    const returnReasonId = reasonRow?.return_reason_id || 1;
    await connection.execute(
      `INSERT INTO oc_return (
        order_id, product_id, customer_id, firstname, lastname, email, telephone,
        product, model, quantity, opened, return_reason_id, return_action_id,
        return_status_id, comment, date_ordered, date_added, date_modified
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orderId,
        itemId,
        customerDetails?.customer_id || 0,
        customerDetails?.firstname || '',
        customerDetails?.lastname || '',
        customerDetails?.email || '',
        customerDetails?.telephone || '',
        productDetails?.name || '',
        productDetails?.model || '',
        1,
        0,
        // returnReasonId,
        2,
        0,
        1,
        comment,
        new Date().toISOString().split('T')[0]
      ]
    );
  }
  const [rows] = await connection.execute(`SELECT COUNT(*) AS total FROM oc_return WHERE order_id = ?`, [orderId]);
  const [cancelledRows] = await connection.execute(`SELECT COUNT(*) AS cancelled FROM oc_return WHERE order_id = ? AND return_status_id = 1`, [orderId]);
  if (rows[0].total > 0 && cancelledRows[0].cancelled === rows[0].total) {
    await connection.execute(`UPDATE oc_order SET order_status_id = ? WHERE order_id = ?`, [8, orderId]);
  }
  await connection.end();
  return orderId;
};

const handleFulfillmentUpdate = async (orderId, fulfillments, transactionId) => {
  const connection = await mysql.createConnection(dbConfig);
  for (const fulfillment of fulfillments) {
    const status = fulfillment.state || "updated";
    const comment = fulfillment.comment || "updated by API";
    await connection.execute(`INSERT INTO oc_order_history (order_id, order_status_id, notify, comment, date_added) VALUES (?, ?, 0, ?, NOW())`, [orderId, status, comment]);
  }
  await connection.end();
  return orderId;
};

const handlePaymentUpdate = async (orderId, payments, transactionId) => {
  const connection = await mysql.createConnection(dbConfig);
  for (const payment of payments) {
    const type = payment.type || "unknown";
    const amount = payment.params?.amount || 0;
    const status = payment.status || "initiated";
    const comment = `Refund ₹${amount} via ${type} - status: ${status}`;
    await connection.execute(`INSERT INTO oc_order_history (order_id, order_status_id, notify, comment, date_added) VALUES (?, ?, 0, ?, NOW())`, [orderId, 5, comment]);
  }
  await connection.end();
  return orderId;
};

const updateHandler = async (req, res) => {
  const { body } = req;
  const context = body.context || {};
  const message = body.message || {};
  const updateTarget = message.update_target;
  const orderId = message.order?.id;
  const transactionId = context.transaction_id;
  const messageId = context.message_id;

  const ackResponse = sendAck({ transaction_id: transactionId, message_id: messageId, action: "on_update", timestamp: new Date().toISOString() });
  const cacheKey = `on_update_ack:${transactionId}:${messageId}`;

  try {
    const cachedAck = await getValue(cacheKey);
    if (cachedAck) return res.status(200).json(ackResponse);
  } catch (err) {
    logger.error({ message: "Error reading ACK cache", err: err.message });
  }

  res.status(200).json(ackResponse);

  setImmediate(async () => {
    try {
      if (!orderId) return logger.error({ message: "Missing order ID in update payload", transactionId });
      if (updateTarget === "item") {
        await handleItemUpdate(orderId, message.order.fulfillments || [], transactionId);
      } else if (updateTarget === "fulfillment") {
        await handleFulfillmentUpdate(orderId, message.order.fulfillments || [], transactionId);
      } else if (updateTarget === "payment") {
        await handlePaymentUpdate(orderId, message.order.payments || [], transactionId);
      } else {
        logger.warn({ message: "Unknown or unsupported update_target", updateTarget, transactionId });
      }
      await setValue(cacheKey, true, 3600);

      const orderMeta = await fetchOrderMetaForUpdate(orderId);
      const ondcResponse = {
      context: {
        ...context,
        action: "on_update",
        bpp_id: context?.bpp_id,
        bpp_uri: context?.bpp_uri,
        timestamp: new Date().toISOString()
      },
      message: {
      order: orderMeta
      }
    
      };

      const { signature, digest, authHeader } = signRequest(ondcResponse);
      const callbackUrl = context.bap_uri ? `${context.bap_uri}/on_update` : `${process.env.ADAPTOR_SITE?.replace(/\/$/, '')}/api/on_update`;
      await axios.post(callbackUrl, ondcResponse, {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          Digest: digest,
          Signature: signature,
          "x-dev-mode": "true"
        }
      });
      logger.info({ message: "Sent /on_update callback", url: callbackUrl, orderId });
    } catch (error) {
      logger.error({ message: "Error processing /update", error: error.message, transactionId });
    }
  });
};

export default updateHandler;  
