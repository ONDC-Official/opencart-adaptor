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

import { getOpenCartToken } from '../utils/opencart.js';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Embedded schema
const updateSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ONDC Update Schema",
  "type": "object",
  "properties": {
    "context": {
      "type": "object",
      "properties": {
        "domain": { "type": "string" },
        "action": { "type": "string", "const": "update" },
        "country": { "type": "string" },
        "city": { "type": "string" },
        "core_version": { "type": "string" },
        "bap_id": { "type": "string" },
        "bap_uri": { "type": "string" },
        "bpp_id": { "type": "string" },
        "bpp_uri": { "type": "string" },
        "transaction_id": { "type": "string" },
        "message_id": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" },
        "ttl": { "type": "string" }
      },
      "required": [
        "domain", "action", "country", "city", "core_version",
        "bap_id", "bap_uri", "bpp_id", "bpp_uri",
        "transaction_id", "message_id", "timestamp"
      ]
    },
    "message": {
      "type": "object",
      "properties": {
        "update_target": {
          "type": "string",
          "enum": ["item", "order", "fulfillment", "payment"]
        },
        "order": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "state": {
              "type": "string",
              "enum": [
                "Packed", "Shipped", "Out-for-delivery", "Delivered", "Cancelled",
                "Return_Initiated", "Return_Approved", "Return_Rejected",
                "Return_Picked", "Return_Delivered"
              ]
            },
            "provider": {
              "type": "object",
              "properties": {
                "id": { "type": "string" }
              },
              "required": ["id"]
            },
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "quantity": {
                    "type": "object",
                    "properties": {
                      "count": { "type": "integer", "minimum": 1 }
                    },
                    "required": ["count"]
                  }
                },
                "required": ["id", "quantity"]
              }
            },
            "fulfillments": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "type": { "type": "string", "enum": ["Delivery", "Return"] },
                  "state": { "type": "string" },
                  "tracking": {
                    "type": "object",
                    "properties": {
                      "id": { "type": "string" },
                      "url": { "type": "string" }
                    }
                  },
                  "tags": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "code": { "type": "string" },
                        "list": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "code": { "type": "string" },
                              "value": { "type": "string" }
                            },
                            "required": ["code", "value"]
                          }
                        }
                      },
                      "required": ["code", "list"]
                    }
                  },
                  "items": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "id": { "type": "string" }
                      },
                      "required": ["id"]
                    }
                  }
                },
                "required": ["type"]
              }
            },
            "payments": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "type": { "type": "string" },
                  "params": {
                    "type": "object",
                    "properties": {
                      "amount": { "type": "number" }
                    },
                    "required": ["amount"]
                  },
                  "status": { "type": "string" }
                },
                "required": ["type", "params", "status"]
              }
            }
          },
          "required": ["id"]
        }
      },
      "required": ["update_target", "order"]
    }
  },
  "required": ["context", "message"]
};


const validateUpdate = ajv.compile(updateSchema);

const updateMiddleware = async (req, res, next) => {
  try {
    const isDevMode = req.headers['x-dev-mode'] === 'true';
    const rawBodyBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // Step 1: Validate request schema
    const isValid = validateUpdate(req.body);
    if (!isValid) {
      logger.warn({ message: "Schema validation failed", errors: validateUpdate.errors });
      return res.status(400).json(
        createNackResponse({
          type: 'DOMAIN-ERROR',
          code: '30001',
          message: 'Invalid update payload',
        })
      );
    }

    if (isDevMode) {
      logger.info('🛠 Developer mode enabled in update middleware – skipping signature verification');
      req.verified_bap_id = req.body.context.bap_id || 'dev-mode-bap';
      req.isValidRequest = true;
      return next();
    }

    // OpenCart Authentication (skipped in dev mode)
    // if (!isDevMode) {
      const apiToken = await getOpenCartToken(req, res);
      if (!apiToken) {
        logger.warn({ 
          message: "OpenCart authentication failed", 
          transactionId: req.body.context?.transaction_id 
        });
        return res.status(500).json({ 
          context: {
            ...req.body.context,
            action: 'on_update',
            timestamp: new Date().toISOString()
          },
          message: {
            ack: {
              status: "NACK"
            }
          },
          error: {
            type: "AUTH-ERROR",
            code: "10002",
            message: "OpenCart authentication failed or missing API token/environment variables."
          }
        });
      }

      req.opencartToken = apiToken;
      req.isValidRequest = true;
    // }

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

    logger.info({ message: 'Update payload verified successfully', bap_id: subscriberId });
    next();

  } catch (error) {
    logger.error({ 
      message: 'Unexpected error in updateMiddleware', 
      error: error.isAxiosError ? error.toJSON?.() : error.message 
    });

    return res.status(500).json({ 
      error: {
        type: "CORE-ERROR",
        code: "50000",
        message: "An error occurred in middleware."
      }
    });
  }
};

export default updateMiddleware;
