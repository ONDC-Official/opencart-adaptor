import axios from 'axios';
import logger from './logger.js'; // Assuming you have a logger
import { ONDC_DEFAULTS } from '../config/ondcConfig.js';

/**
 * Forwards an ONDC request to a specified BPP or BAP callback URI.
 * @param {string} callbackUrl The callback URL to forward the request to.
 * @param {object} payload The ONDC request payload to forward.
 * @param {object} [headers] Optional headers to include in the forwarded request.
 * @param {number} [timeout=5000] Optional timeout for the request in milliseconds (default: 5000).
 * @returns {Promise<object|null>} The response data from the receiver if successful, otherwise null.
 */
export const forwardRequest = async (callbackUrl, payload, headers = {}, timeout = 5000) => {
  try {
    const response = await axios.post(callbackUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: timeout,
    });
    logger.info({ message: 'Forwarded request successfully', url: callbackUrl, responseStatus: response.status });
    return response.data;
  } catch (error) {
    logger.error({
      message: 'Error forwarding request',
      url: callbackUrl,
      errorMessage: error.message,
      errorDetails: error.isAxiosError ? error.toJSON() : error,
    });
    return null;
  }
};

export const getRegistryUrl = () => process.env.ONDC_REGISTRY_URL || ONDC_DEFAULTS.REGISTRY_URL;

export const getSubscriberId = () => {
  const subscriberId = process.env.ONDC_SUBSCRIPTION_ID;
  if (!subscriberId) throw new Error('ONDC_SUBSCRIPTION_ID not configured');
  return subscriberId;
};

export const getDomain = () => process.env.ONDC_DOMAIN || ONDC_DEFAULTS.DOMAIN;
export const getCountry = () => process.env.ONDC_COUNTRY || ONDC_DEFAULTS.COUNTRY;
export const getCity = () => process.env.ONDC_CITY || ONDC_DEFAULTS.CITY;

export default {
  forwardRequest,
  getRegistryUrl,
  getSubscriberId,
  getDomain,
  getCountry,
  getCity
};