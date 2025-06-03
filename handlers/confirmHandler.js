import axios from "axios";
import mysql from "mysql2/promise";
import { signRequest } from "../auth/cryptoUtils.js";
import logger from "../utils/logger.js";
import json5 from 'json5';
const { parse } = json5;

// DB Config
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

function extractJsonFromResponse(htmlLikeString) {
  try {
    const match = htmlLikeString.match(/\{\\?"success\\?":\\?".+?\\?",\\?"order_id\\?":\d+}/);
    if (match) {
      const cleaned = match[0].replace(/\\"/g, '"'); 
      return JSON.parse(cleaned);
    }

    const jsonStart = htmlLikeString.lastIndexOf('{');
    const cleaned = htmlLikeString.slice(jsonStart);
    return parse(cleaned); 
  } catch (err) {
    return null;
  }
}


// fetch order details
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
    tags: [{ code: "type", list: [{ code: "type", value: "item" }] }]
  }));

  const fulfillments = [{
    id: "F1",
    state: { descriptor: { code: "Accepted" } },
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
      contact: { phone: order.telephone, email: order.email }
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
      contact: { phone: order.telephone, email: order.email }
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

// Final confirm handler
export default async function confirmHandler(req, res) {
  console.log("confirm handler executed");

  try {
    const { context, message } = req.body;
    const isValidRequest = req.isValidRequest;
    const transactionId = context?.transaction_id;
    const messageId = context?.message_id;

    if (!isValidRequest) {
      logger.warn("NACK: Invalid request signature");
      return res.status(200).json({
        response: {
          context: {
            ...context,
            action: "on_confirm",
            bpp_id: context?.bpp_id,
            bpp_uri: context?.bpp_uri,
          },
          message: {
            ack: { status: "NACK" },
          },
          error: {
            type: "AUTH_ERROR",
            code: "10002",
            message: "Authentication failed or missing credentials",
          },
        },
      });
    }

    // Send ACK immediately
    res.status(200).json({
      response: {
        context: {
          ...context,
          action: "on_confirm",
          bpp_id: context?.bpp_id,
          bpp_uri: context?.bpp_uri,
        },
        message: {
          ack: { status: "ACK" },
        },
      },
    });

    // Process in background
    setImmediate(async () => {
      try {
    const signedBody = req.body;

    const { signature, digest, authHeader } = signRequest(signedBody);
    const orderApiResponse = await axios.post(`${process.env.ADAPTOR_SITE}/api/order`, signedBody, {
      headers: {
        'x-internal-call': 'true',
        'Content-Type': 'application/json',
        "x-dev-mode": "true",
        Authorization: authHeader,
        Digest: digest,
        Signature: signature
      }
    });
       
       // 2. Parse response and extract orderId
    let orderData = orderApiResponse.data;
    if (typeof orderData === 'string') {
      orderData = extractJsonFromResponse(orderData);
    }
    // Patch for fake mail() failure error but valid order
    let orderId = orderData.orderId;

    if (
      orderData &&
      orderData.success === false &&
      typeof orderData.error === 'string' &&
      orderData.error.includes('"Success: You have modified orders!"') &&
      orderData.error.includes('"order_id"')
    ) {
      const match = orderData.error.match(/"order_id":\s*(\d+)/);
      const orderId = match ? parseInt(match[1], 10) : null;
      if (orderId) {
        logger.warn("Received mail() failure but valid order response. Overriding success.");
        orderData = {
          success: true,
          orderId
        };
      }
    }

    if (!orderId) {
      logger.warn("No valid orderId. Skipping fetchOrderDetails.");
      return; 
    }

    // const orderId = orderData.orderId;
    logger.info({ message: "Order created successfully", orderId });

    // 3. Fetch enriched order meta from DB
    const orderMeta = await fetchOrderDetails(orderId);

    // 4. Build final ondcResponse payload
    const ondcResponse = {
      context: {
        ...context,
        action: "on_confirm",
        bpp_id: context?.bpp_id,
        bpp_uri: context?.bpp_uri,
        timestamp: new Date().toISOString(),
      },
      message: {
        order: orderMeta
      }
    };

    // 5. Sign and send to BAP
    const callbackUrl = context.bap_uri ? `${context.bap_uri}/on_confirm` : `${process.env.ADAPTOR_SITE?.replace(/\/$/, '')}/api/on_confirm`;

    const response = await axios.post(callbackUrl, ondcResponse, {
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
    }  catch (err) {
        logger.error({ message: "Error processing /confirm or sending /on_confirm", error: err.message });
        }
      });
      } catch (err) {
        logger.error({ message: "Fatal error in /confirm handler", error: err.message });
        if (!res.headersSent) {
          res.status(500).json({
            error: {
            type: "INTERNAL_ERROR",
            code: "50000",
            message: "Failed to process /confirm"
            }
          });
        }
      }}