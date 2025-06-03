import axios from 'axios';
import FormData from 'form-data';
import logger from '../utils/logger.js';

export default async function confirmMiddleware(req, res, next) {
  logger.info("Middleware triggered for /confirm");
  req.processedAt = new Date();

  try {
    const authCookie = req.cookies;
    logger.debug({ message: "Cookies received", cookies: authCookie });

    // Extract opencart api_token from cookies
    const token = authCookie?.api_token;
    const isTokenPresent = !!token;

    if(!isTokenPresent) {
      try {
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

        if (!loginResponse.data?.api_token) {
          logger.error({ message: "OpenCart login failed - no token in response" });
          req.isValidRequest = false;
          return next();
        }

        const apiToken = loginResponse.data.api_token;
        logger.info({ message: "Login success. API Token received" });

        res.cookie("api_token", apiToken, { httpOnly: true, maxAge: 3600000 });
        req.cookies.api_token = apiToken;
      } catch (error) {
        logger.error({ 
          message: "OpenCart login failed", 
          error: error.message,
          response: error.response?.data
        });
        req.isValidRequest = false;
        return next();
      }
    }

    // Extract api_token from cookies
    const apiToken = authCookie?.api_token;
    
    // Check if .env has necessary credentials
    const hasCredentials = process.env.OPENCART_USERNAME && process.env.OPENCART_KEY;

    // Validation logic
    const isValidRequest = !!(apiToken && hasCredentials);

    req.isValidRequest = isValidRequest;

    if (isValidRequest) {
      logger.info('Valid request. Proceeding...');
    } else {
      logger.warn('Invalid request. Missing Opencart token or env credentials.');
    }

    next();
    
  } catch (error) {
    logger.error({ message: "Middleware Error", error: error.message });
    req.isValidRequest = false;
    next();
  }
}
