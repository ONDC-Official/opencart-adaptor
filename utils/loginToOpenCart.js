import axios from 'axios';
import logger from './logger.js';

const OPENCART_BASE_URL = process.env.OPENCART_SITE;
const OPENCART_USERNAME = process.env.OPENCART_USERNAME;
const OPENCART_PASSWORD = process.env.OPENCART_KEY;

/**
 * Logs into the OpenCart API and returns the api_token
 * @returns {Promise<string>} The API token
 * @throws If login fails or token is missing
 */
async function loginToOpenCart() {
  try {
    const resp = await axios.post(
      `${OPENCART_BASE_URL}?route=api/login`,
      {
        username: OPENCART_USERNAME,
        key: OPENCART_PASSWORD
      },
      { timeout: 5000 }
    );

    if (!resp.data.token) {
      throw new Error('Login response missing token');
    }

    logger.info('Login to OpenCart successful');
    return resp.data.token;
  } catch (err) {
    logger.error('OpenCart login failed', { error: err.message });
    throw err;
  }
}

export default loginToOpenCart;