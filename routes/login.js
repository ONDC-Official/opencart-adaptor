import express from 'express';
import logger from '../utils/logger.js';
import { createNackResponse } from '../utils/ondcUtils.js';
import { verifySignature } from '../auth/cryptoUtils.js';
import { lookupSubscriber } from '../auth/registryService.js';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const isDevMode = req.headers['x-dev-mode'] === 'true';
    const { context, message } = req.body;

    // Basic validation
    if (!context || !message) {
      logger.warn({ message: "Invalid request body in dev mode", body: req.body });
      return res.status(400).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40001',
          message: 'Invalid request body format'
        })
      );
    }

    // Validate required context fields
    const requiredContextFields = ['domain', 'action', 'country', 'city', 'core_version', 'bap_id', 'bap_uri', 'transaction_id', 'message_id', 'timestamp'];
    const missingFields = requiredContextFields.filter(field => !context[field]);
    
    if (missingFields.length > 0) {
      logger.warn({ message: "Missing required context fields", missingFields });
      return res.status(400).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40002',
          message: `Missing required fields: ${missingFields.join(', ')}`
        })
      );
    }

    // Validate message fields
    if (!message.username || !message.key) {
      logger.warn({ message: "Missing username or key in message" });
      return res.status(400).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40003',
          message: 'Missing username or key in message'
        })
      );
    }

    // Always validate OpenCart credentials, even in dev mode
    try {
      const loginData = new FormData();
      loginData.append("username", message.username);
      loginData.append("key", message.key);

      const loginResponse = await axios.post(
        `${process.env.OPENCART_SITE}/index.php?route=api/login`,
        loginData
      );

      if (!loginResponse.data.api_token) {
        logger.warn({ message: "OpenCart login failed - invalid credentials" });
        return res.status(401).json(
          createNackResponse({
            type: 'AUTH-ERROR',
            code: '40108',
            message: 'Invalid OpenCart credentials'
          })
        );
      }

      // Store the OpenCart token
      const apiToken = loginResponse.data.api_token;
      res.cookie("api_token", apiToken, { httpOnly: true, maxAge: 3600000 });
      req.cookies = { ...req.cookies, api_token: apiToken };

    } catch (error) {
      logger.error({ message: "OpenCart login failed", error: error.message });
      return res.status(401).json(
        createNackResponse({
          type: 'AUTH-ERROR',
          code: '40108',
          message: 'OpenCart authentication failed'
        })
      );
    }

    // In dev mode, skip ONDC signature verification
    if (isDevMode) {
      logger.info('🛠 Developer mode enabled – skipping ONDC signature verification');
      req.signatureVerified = true;
      req.verifiedBapId = context.bap_id;
      return res.status(200).json({
        context: {
          ...context,
          action: 'on_login'
        },
        message: {
          ack: {
            status: 'ACK'
          }
        }
      });
    }

    // Verify ONDC signature if not in dev mode
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40101',
          message: 'Missing Authorization header'
        })
      );
    }

    // Parse authorization header
    const authParams = parseAuthHeader(authHeader);
    if (!authParams) {
      logger.warn('Invalid Authorization header format', { header: authHeader });
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40102',
          message: 'Invalid Authorization header format'
        })
      );
    }

    const { ukId, signature, digest, created, expires } = authParams;

    // Validate timestamps
    const now = Math.floor(Date.now() / 1000);
    if (Number(created) > now) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40103',
          message: 'Invalid created timestamp'
        })
      );
    }
    if (Number(expires) < now) {
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40104',
          message: 'Signature expired'
        })
      );
    }

    // Lookup subscriber and verify signature
    const subscriber = await lookupSubscriber('*', ukId);
    if (!subscriber || !subscriber.signing_public_key) {
      logger.warn('Public key not found for ukId', { ukId });
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40105',
          message: 'Public key not found for ukId'
        })
      );
    }

    const isVerified = await verifySignature(req.rawBody, signature, digest, subscriber.signing_public_key);
    
    if (!isVerified) {
      logger.warn('Signature verification failed', { ukId });
      return res.status(401).json(
        createNackResponse({
          type: 'PROTOCOL-ERROR',
          code: '40106',
          message: 'Invalid signature'
        })
      );
    }

    // Store the verification result in the request for reuse
    req.signatureVerified = true;
    req.verifiedBapId = subscriber.subscriber_id;

    // Return success response
    return res.status(200).json({
      context: {
        ...context,
        action: 'on_login'
      },
      message: {
        ack: {
          status: 'ACK'
        }
      }
    });

  } catch (error) {
    logger.error({ message: 'Error in login handler', error: error.message });
    return res.status(500).json(
      createNackResponse({
        type: 'CORE-ERROR',
        code: '50000',
        message: 'Internal server error'
      })
    );
  }
});

export default router; 