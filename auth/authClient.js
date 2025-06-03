import axios from 'axios';
import { signRequest } from './cryptoUtils.js';
import logger from '../utils/logger.js';
import { ONDC_DEFAULTS } from '../config/ondcConfig.js';

const makeAuthenticatedRequest = async (url, payload, options = {}) => {
  try {
    const { authHeader } = signRequest(payload);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...options.headers
    };

    const response = await axios({
      method: options.method || 'POST',
      url,
      data: payload,
      headers,
      timeout: options.timeout || ONDC_DEFAULTS.REQUEST_TIMEOUT
    });

    return response.data;
  } catch (error) {
    logger.error('Error making authenticated request', { error: error.message });
    throw error;
  }
};

export { makeAuthenticatedRequest };