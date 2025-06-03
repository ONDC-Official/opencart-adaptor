import mysql from 'mysql2/promise';
import logger from "../utils/logger.js";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  maxRetries: 3,
  retryDelay: 1000
};

const connectWithRetry = async (config, retries = config.maxRetries) => {
  try {
    return await mysql.createConnection(config);
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return connectWithRetry(config, retries - 1);
    }
    throw error;
  }
};

const onStatusHandler = async (req, res) => {
  let connection;
  try {
    const orderId = req.body?.message?.order?.id;
    const orderState = req.body?.message?.order?.state || "Unknown";

    if (!orderId) {
      return res.status(400).json({
        message: { ack: { status: "NACK" } },
        error: { code: "40000", message: "Missing order.id" }
      });
    }

    connection = await connectWithRetry(dbConfig);

    const [statusRows] = await connection.execute(
      'SELECT os.name FROM oc_order_status os JOIN oc_order o ON o.order_status_id = os.order_status_id WHERE o.order_id = ?',
      [orderId]
    );

    if (statusRows.length === 0) {
      return res.status(404).json({
        message: { ack: { status: "NACK" } },
        error: { code: "40400", message: "Order status not found" }
      });
    }

    res.status(200).json({
      message: {
        ack: { status: "ACK" },
        order: {
          id: orderId,
          state: orderState,
          status: {
            name: statusRows[0].name
          }
        }
      }
    });
  } catch (error) {
    logger.error("onStatus Handler Error:", error);
    res.status(500).json({
      message: { ack: { status: "NACK" } },
      error: {
        code: "50001",
        message: "Internal server error",
        details: error.message
      }
    });
  } finally {
    if (connection) await connection.end();
  }
};

export default onStatusHandler;
