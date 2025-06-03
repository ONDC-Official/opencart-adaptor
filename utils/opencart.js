import axios from "axios";
import FormData from "form-data";
import logger from "./logger.js";

// --- OpenCart Configuration ---
const OPENCART_BASE_URL = process.env.OPENCART_SITE;
const OPENCART_API_TIMEOUT = parseInt(process.env.OPENCART_API_TIMEOUT || '5000');

export const loginToOpenCart = async (transactionId) => {
  try {
    if (!process.env.OPENCART_USERNAME || !process.env.OPENCART_KEY) {
      logger.error({ 
        message: "OpenCart credentials not configured",
        transactionId
      });
      return null;
    }

    const loginData = new FormData();
    loginData.append("username", process.env.OPENCART_USERNAME);
    loginData.append("key", process.env.OPENCART_KEY);

    const loginResponse = await axios.post(
      `${process.env.OPENCART_SITE}/index.php?route=api/login`,
      loginData,
      {
        timeout: 5000,
        headers: {
          ...loginData.getHeaders()
        }
      }
    );

    if (!loginResponse.data || !loginResponse.data.api_token) {
      logger.error({ 
        message: "OpenCart login failed - no token in response", 
        data: loginResponse.data,
        transactionId
      });
      return null;
    }

    const apiToken = loginResponse.data.api_token;
    logger.info({ 
      message: "OpenCart login success", 
      transactionId
    });

    return apiToken;
  } catch (error) {
    logger.error({ 
      message: "OpenCart login failed", 
      error: error.message,
      response: error.response?.data,
      transactionId
    });
    return null;
  }
};

export const getOpenCartToken = async (req, res) => {
  const transactionId = req.body.context?.transaction_id;
  
  // First try to get token from request headers
  const authHeader = req.headers['x-api-token'];
  if (authHeader) {
    logger.info({ 
      message: "Using token from header",
      transactionId
    });
    return authHeader;
  }

  // Then try cookie
  const token = req.cookies?.api_token;
  if (token) {
    logger.info({ 
      message: "Using token from cookie",
      transactionId
    });
    return token;
  }

  // If no token found, try to login
  logger.info({ 
    message: "No token found, attempting login",
    transactionId
  });

  const apiToken = await loginToOpenCart(transactionId);
  if (apiToken) {
    // Set cookie with token
    res.cookie("api_token", apiToken, { 
      httpOnly: true, 
      maxAge: 3600000, // 1 hour
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Also set in request for handler to use
    req.cookies = { ...req.cookies, api_token: apiToken };
    return apiToken;
  }

  return null;
};

export const cancelOpenCartOrder = async (apiToken, orderId, message, transactionId) => {
  if (!orderId) {
    logger.error({ message: "Missing order ID from ONDC payload.", transactionId });
    return false;
  }

  try {
    logger.info({ message: "Cancelling OpenCart order", orderId, transactionId });
    const response = await axios.post(
      `${OPENCART_BASE_URL}?route=api/order/history&api_token=${apiToken}`,
      {
        order_id: orderId,
        order_status_id: 7, // Cancelled status
        notify: 0,
        comment: `Order cancelled via ONDC /on_cancel. (Txn ID: ${transactionId})`,
      },
      { timeout: OPENCART_API_TIMEOUT }
    );

    if (response?.data?.success) {
      logger.info({ message: "Order cancellation successful", orderId, transactionId, responseData: response.data });
      return true;
    } else {
      logger.error({ message: "OpenCart cancellation returned failure", orderId, transactionId, responseData: response?.data });
      return false;
    }
  } catch (error) {
    logger.error({
      message: "Failed to cancel order in OpenCart",
      orderId,
      transactionId,
      error: error.isAxiosError ? error.toJSON?.() : error.message
    });
    return false;
  }
}; 