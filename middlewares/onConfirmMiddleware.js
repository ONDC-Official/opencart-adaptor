import axios from "axios";
import mysql from "mysql2/promise";
import { sendAck } from "../utils/sendResponse.js";
import { getValue, setValue } from "../utils/cache.js";
import { signRequest } from "../auth/cryptoUtils.js";
import logger from "../utils/logger.js";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const fetchOrderDetails = async (orderId) => {
  const connection = await mysql.createConnection(dbConfig);

  const [[order]] = await connection.execute(
    `SELECT * FROM oc_order WHERE order_id = ?`,
    [orderId]
  );

  const [products] = await connection.execute(
    `SELECT * FROM oc_order_product WHERE order_id = ?`,
    [orderId]
  );

  await connection.end();

  const items = products.map(p => ({
    id: `I${p.product_id}`,
    fulfillment_id: `F${p.order_product_id}`,
    quantity: { count: p.quantity },
    tags: [
      {
        code: "type",
        list: [
          { code: "type", value: "item" }
        ]
      }
    ]
  }));

  const fulfillments = [{
    id: "F1",
    state: {
      descriptor: { code: "Accepted" }
    },
    type: "Delivery",
    tracking: true,
    "@ondc/org/TAT": "PT60M",
    start: {
      location: {
        id: "L1",
        descriptor: { name: order.store_name },
        gps: "12.956399,77.636803",
        address: {
          locality: order.shipping_address_1,
          city: order.shipping_city,
          area_code: order.shipping_postcode,
          state: order.shipping_zone
        }
      },
      contact: {
        phone: order.telephone,
        email: order.email
      }
    },
    end: {
      location: {
        gps: "12.453544,77.928379",
        address: {
          name: `${order.shipping_firstname} ${order.shipping_lastname}`,
          building: order.shipping_address_1,
          locality: order.shipping_address_2,
          city: order.shipping_city,
          state: order.shipping_zone,
          country: order.shipping_country,
          area_code: order.shipping_postcode
        }
      },
      contact: {
        phone: order.telephone,
        email: order.email
      }
    }
  }];

  return {
    id: order.order_id,
    state: "Accepted",
    provider: {
      id: String(order.store_id),
      locations: [{ id: "L1" }]
    },
    items,
    billing: {
      name: `${order.payment_firstname} ${order.payment_lastname}`,
      phone: order.telephone,
      email: order.email,
      address: {
        name: `${order.payment_firstname} ${order.payment_lastname}`,
        building: order.payment_address_1,
        locality: order.payment_address_2,
        city: order.payment_city,
        state: order.payment_zone,
        country: order.payment_country,
        area_code: order.payment_postcode
      },
      created_at: order.date_added,
      updated_at: order.date_modified
    },
    fulfillments
  };
};

const onConfirmHandler = async (req, res) => {
  const { body } = req;
  const context = body.context || {};
  const messageId = context.message_id;
  const transactionId = context.transaction_id;
  const orderId = body?.message?.order?.id;

  const ack = sendAck({
    transaction_id: transactionId,
    message_id: messageId,
    action: "on_confirm",
    timestamp: new Date().toISOString()
  });

  res.status(200).json(ack);

  setImmediate(async () => {
    try {
      const orderMeta = await fetchOrderDetails(orderId);

      const responsePayload = {
        context: {
          ...context,
          action: "on_confirm",
          bpp_id: context?.bpp_id,
          bpp_uri: context?.bpp_uri,
          timestamp: new Date().toISOString()
        },
        message: {
          order: orderMeta
        }
      };

      const { signature, digest, authHeader } = signRequest(responsePayload);
      const bapCallback = `${context.bap_uri}/on_confirm`;

      const response = await axios.post(bapCallback, responsePayload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          Digest: digest,
          Signature: signature,
          "x-dev-mode": "true"
        }
      });

      logger.info({
        message: "Sent /on_confirm to BAP",
        status: response.status,
        data: response.data
      });

    } catch (err) {
      logger.error({
        message: "Error sending /on_confirm to BAP",
        error: err.message,
        stack: err.stack
      });
    }
  });
};

export default onConfirmHandler;
