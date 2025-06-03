import logger from './logger.js';
import authRequestClient from '../auth/authRequestClient.js';
import { loginToOpenCart } from './opencart.js';
import axios from 'axios';

// --- OpenCart Configuration ---
const OPENCART_BASE_URL = process.env.OPENCART_SITE;
const OPENCART_API_TIMEOUT = parseInt(process.env.OPENCART_API_TIMEOUT || '5000');

/**
 * Send callback to BAP with retry logic and authentication
 * @param {string} url - Callback URL
 * @param {Object} payload - Callback payload
 * @param {string} transactionId - ONDC transaction ID for logging
 * @param {string} type - Callback type (e.g., 'on_init', 'on_confirm')
 * @returns {Promise<Object>} Result with success status
 */
const sendCallback = async (url, payload, transactionId, type) => {
  // Use the authenticated request client for sending callbacks
  const result = await authRequestClient.sendAuthenticatedCallback(url, payload, transactionId, type);
  
  // Record callback status in order metadata
  await recordCallbackStatus(transactionId, type, result.success, result.error);
  
  return result;
};

/**
 * Record callback status in order metadata
 * @param {string} transactionId - ONDC transaction ID
 * @param {string} callbackType - Type of callback (e.g., 'on_init', 'on_confirm')
 * @param {boolean} success - Whether the callback was successful
 * @param {string} errorMessage - Error message if unsuccessful
 * @returns {Promise<void>}
 */
const recordCallbackStatus = async (transactionId, callbackType, success, errorMessage = '') => {
  try {
    const apiToken = await loginToOpenCart(transactionId);
    if (!apiToken) {
      logger.error('Failed to get OpenCart API token for recording callback status', {
        transactionId,
        callbackType
      });
      return;
    }

    // Find order by transaction ID
    const response = await axios.get(
      `${OPENCART_BASE_URL}?route=api/order&api_token=${apiToken}`,
      {
        params: {
          filter_transaction_id: transactionId
        },
        timeout: OPENCART_API_TIMEOUT
      }
    );
    
    const orders = response?.data?.data;
    if (!orders || orders.length === 0) {
      logger.warn('Could not find order for recording callback status', {
        transactionId,
        callbackType
      });
      return;
    }
    
    const order = orders[0];
    const timestamp = new Date().toISOString();
    
    // Prepare metadata for callback status
    const orderData = {
      order_id: order.order_id,
      order_status_id: order.order_status_id,
      comment: `ONDC ${callbackType} callback ${success ? 'successful' : 'failed'} at ${timestamp}${!success && errorMessage ? `. Error: ${errorMessage}` : ''}`
    };
    
    // Update order with callback status
    await axios.post(
      `${OPENCART_BASE_URL}?route=api/order/history&api_token=${apiToken}`,
      orderData,
      { timeout: OPENCART_API_TIMEOUT }
    );
    
    logger.info(`Recorded ${callbackType} callback status`, {
      transactionId,
      orderId: order.order_id,
      status: success ? 'success' : 'failed'
    });
  } catch (error) {
    logger.error('Error recording callback status', {
      transactionId,
      callbackType,
      error: error.isAxiosError ? error.toJSON?.() : error.message
    });
    // Non-critical operation, so we don't throw the error
  }
};

/**
 * Send multiple callbacks in sequence
 * @param {Array<Object>} callbacks - Array of callback objects with url, payload, and type
 * @param {string} transactionId - ONDC transaction ID for logging
 * @returns {Promise<Array<Object>>} Array of callback results
 */
const sendMultipleCallbacks = async (callbacks, transactionId) => {
  const results = [];
  
  for (const callback of callbacks) {
    logger.info(`Sending ${callback.type} callback`, {
      transactionId,
      url: callback.url
    });
    
    const result = await sendCallback(
      callback.url,
      callback.payload,
      transactionId,
      callback.type
    );
    
    results.push({
      type: callback.type,
      success: result.success,
      data: result.data
    });
    
    // If a critical callback fails, we might want to abort the sequence
    if (!result.success && callback.critical) {
      logger.error(`Critical callback ${callback.type} failed, aborting sequence`, {
        transactionId
      });
      break;
    }
  }
  
  return results;
};

/**
 * Send a callback and update order status based on result
 * @param {string} url - Callback URL
 * @param {Object} payload - Callback payload
 * @param {string} transactionId - ONDC transaction ID
 * @param {string} type - Callback type
 * @param {Object} statusMapping - Mapping of callback result to order status
 * @returns {Promise<Object>} Callback result
 */
const sendCallbackAndUpdateStatus = async (url, payload, transactionId, type, statusMapping = {}) => {
  const result = await sendCallback(url, payload, transactionId, type);
  
  // Default status mappings if not provided
  const defaultMapping = {
    success: 2, // Processing
    failure: 7  // On Hold
  };
  
  const mapping = { ...defaultMapping, ...statusMapping };
  
  try {
    const apiToken = await loginToOpenCart(transactionId);
    if (!apiToken) {
      logger.error('Failed to get OpenCart API token for updating order status', {
        transactionId,
        type
      });
      return result;
    }

    // Find order by transaction ID
    const response = await axios.get(
      `${OPENCART_BASE_URL}?route=api/order&api_token=${apiToken}`,
      {
        params: {
          filter_transaction_id: transactionId
        },
        timeout: OPENCART_API_TIMEOUT
      }
    );
    
    const orders = response?.data?.data;
    if (orders && orders.length > 0) {
      const order = orders[0];
      const newStatus = result.success ? mapping.success : mapping.failure;
      
      // Update order status
      await axios.post(
        `${OPENCART_BASE_URL}?route=api/order/history&api_token=${apiToken}`,
        {
          order_id: order.order_id,
          order_status_id: newStatus,
          comment: `ONDC ${type} callback ${result.success ? 'successful' : 'failed'}. Status updated to ${newStatus}`
        },
        { timeout: OPENCART_API_TIMEOUT }
      );
      
      logger.info(`Updated order status after ${type} callback`, {
        transactionId,
        orderId: order.order_id,
        newStatus
      });
    }
  } catch (error) {
    logger.error(`Error updating order status after ${type} callback`, {
      transactionId,
      error: error.isAxiosError ? error.toJSON?.() : error.message
    });
  }
  
  return result;
};

export {
  sendCallback,
  recordCallbackStatus,
  sendMultipleCallbacks,
  sendCallbackAndUpdateStatus
};