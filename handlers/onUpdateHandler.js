import mysql from "mysql2/promise";
import axios from "axios";
import { fetchOrderMetaForUpdate } from "../services/fetchOrderMetaForUpdate.js";
import { signRequest } from "../auth/cryptoUtils.js";
import logger from "../utils/logger.js";
import {
  handleItemUpdate,
  handleFulfillmentUpdate,
  handlePaymentUpdate
} from "../services/updateOperations.js";

export default async function onUpdateHandler(req, res) {
  console.log("onUpdateHandler executed");

  try {
    const { context = {}, message = {} } = req.body;
    const orderId = message?.order?.id;
    const transactionId = context.transaction_id;

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    const updateTarget = message.update_target;

    if (updateTarget === "item") {
      await handleItemUpdate(orderId, message.order.fulfillments || [], transactionId);
    } else if (updateTarget === "fulfillment") {
      await handleFulfillmentUpdate(orderId, message.order.fulfillments || [], transactionId);
    } else if (updateTarget === "payment") {
      await handlePaymentUpdate(orderId, message.order.payments || [], transactionId);
    } else {
      logger.warn({ message: "Unknown update_target", updateTarget });
    }

    const orderMeta = await fetchOrderMetaForUpdate(orderId);
    const ondcResponse = {
      context: {
        ...context,
        action: "on_update",
        bpp_id: process.env.BPP_ID,
        bpp_uri: process.env.BPP_URI,
        timestamp: new Date().toISOString(),
      },
      message: { order: orderMeta },
    };
    console.log("Incoming /on_update request body:", JSON.stringify(req.body, null, 2));

    const { signature, digest, authHeader } = signRequest(ondcResponse);
    const callbackUrl = context.bap_uri
      ? `${context.bap_uri}/on_update`
      : `${process.env.ADAPTOR_SITE?.replace(/\/$/, "")}/api/on_update`;

    const response = await axios.post(callbackUrl, ondcResponse, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        Digest: digest,
        Signature: signature,
        "x-dev-mode": "true",
      },
    });

    console.log("Successfully sent /on_update callback to BAP:", response.status);
    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Error in onUpdateHandler:", err.message);
    res.status(500).json({ error: "Internal error while processing update" });
  }
}
