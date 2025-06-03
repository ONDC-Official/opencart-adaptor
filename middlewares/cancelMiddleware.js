import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import logger from '../utils/logger.js';
import {
  parseAuthorizationHeader,
  validateTimestamps,
  parseKeyId,
  verifySignature,
  createNackResponse,
} from '../utils/ondcUtils.js';
import { lookupPublicKeyByUkId } from '../utils/lookupPublicKeyByUkId.js';
import axios from 'axios';

const cancelSchema = {
  type: 'object',
  properties: {
    context: {
      type: 'object',
      required: ['domain', 'action', 'country', 'city', 'core_version', 'bap_id', 'bap_uri', 'transaction_id', 'message_id', 'timestamp'],
      properties: {
        action: { const: 'cancel' }
      }
    },
    message: {
      type: 'object',
      required: ['order_id', 'cancellation_reason_id'],
    },
  },
  required: ['context', 'message'],
};

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateCancel = ajv.compile(cancelSchema);

const cancelMiddleware = async (req, res, next) => {
  try {
    const isDevMode = req.headers['x-dev-mode'] === 'true';
    const rawBodyBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // Step 1: Validate request schema
    const isValid = validateCancel(req.body);
    if (!isValid) {
      logger.warn({ message: "Schema validation failed", errors: validateCancel.errors });
      return res.status(400).json(
        createNackResponse({
          type: 'DOMAIN-ERROR',
          code: '30001',
          message: 'Invalid cancel payload',
        })
      );
    }

    if (isDevMode) {
      logger.info('🛠 Developer mode enabled in cancel middleware – skipping signature verification');
      // Set verified BAP ID from request body
      req.verified_bap_id = req.body.context.bap_id || 'dev-mode-bap';
      return next();
    }

    // OpenCart Authentication (skipped in dev mode)
    if (!isDevMode) {
      const authCookie = req.cookies;
      logger.debug({ message: "Cookies received", cookies: authCookie });

      const token = authCookie?.api_token;
      const isTokenPresent = !!token;

      if (!isTokenPresent) {
        const loginData = new FormData();
        loginData.append("username", process.env.OPENCART_USERNAME);
        loginData.append("key", process.env.OPENCART_KEY);

        try {
          const loginResponse = await axios.post(
            `${process.env.OPENCART_SITE}/index.php?route=api/login`,
            loginData
          );

          const apiToken = loginResponse.data.api_token;
          logger.info({ message: "Login success", apiToken });

          res.cookie("api_token", apiToken, { httpOnly: true, maxAge: 3600000 });
          req.cookies.api_token = apiToken;
        } catch (error) {
          logger.error({ message: "OpenCart login failed", error: error.message });
          return res.status(500).json({ 
            error: {
              type: "CORE-ERROR",
              code: "50000",
              message: "An error occurred in middleware."
            }
          });
        }
      }

      const apiToken = authCookie?.api_token;
      const hasCredentials = process.env.OPENCART_USERNAME && process.env.OPENCART_KEY;
      const isValidRequest = !!(apiToken && hasCredentials);

      req.isValidRequest = isValidRequest;

      if (!isValidRequest) {
        logger.warn({ message: "Invalid request. Missing OpenCart token or env credentials." });
        return res.status(500).json({ 
          error: {
            type: "CORE-ERROR",
            code: "50000",
            message: "An error occurred in middleware."
          }
        });
      }
    } else {
      // In dev mode, we skip OpenCart auth but still need to set isValidRequest
      req.isValidRequest = true;
    }

    // Step 2: Parse and validate Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40101',
          message: 'Missing Authorization header',
        })
      );
    }

    const parsedHeader = parseAuthorizationHeader(authHeader);
    if (!parsedHeader || parsedHeader.algorithm !== 'ed25519' || parsedHeader.headers !== '(created) (expires) digest') {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40102',
          message: 'Invalid or malformed Authorization header',
        })
      );
    }

    const { created, expires, signature, keyId } = parsedHeader;
    if (!validateTimestamps(created, expires)) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40103',
          message: 'Authorization timestamp invalid or expired',
        })
      );
    }

    // Step 3: Extract subscriberId and uniqueKeyId
    const { subscriberId, uniqueKeyId } = parseKeyId(keyId);
    if (!subscriberId || !uniqueKeyId) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40104',
          message: 'Invalid keyId format',
        })
      );
    }

    // Step 4: Lookup public key from registry
    const publicKey = await lookupPublicKeyByUkId(uniqueKeyId);
    if (!publicKey) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40105',
          message: 'Public key not found for given key ID',
        })
      );
    }

    // Step 5: Verify the signature
    const isVerified = await verifySignature(signature, created, expires, rawBodyBuffer, publicKey);
    if (!isVerified) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40106',
          message: 'Signature verification failed',
        })
      );
    }

    // Step 6: Set verified BAP ID
    req.verified_bap_id = subscriberId;

    logger.info({ message: 'Cancel payload verified successfully', bap_id: subscriberId });
    next();

  } catch (error) {
    logger.error({ message: 'Unexpected error in cancelMiddleware', error: error.message });
    return res.status(500).json({ 
      error: {
        type: "CORE-ERROR",
        code: "50000",
        message: "An error occurred in middleware."
      }
    });
  }
};

export default cancelMiddleware;
