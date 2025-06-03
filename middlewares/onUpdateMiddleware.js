
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
import lookupPublicKey from '../utils/registryLookup.js';

// --- Schema Validation Setup ---
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Embedded schema
const onUpdateSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ONDC On Update Schema",
  "type": "object",
  "required": ["context", "message"],
  "properties": {
    "context": {
      "type": "object",
      "required": ["transaction_id", "message_id"],
      "properties": {
        "transaction_id": {
          "type": "string",
          "minLength": 1
        },
        "message_id": {
          "type": "string",
          "minLength": 1
        },
        "domain": {
          "type": "string"
        },
        "action": {
          "type": "string"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        }
      },
      "additionalProperties": true
    },
    "message": {
      "type": "object",
      "description": "Message payload for the /on_update API",
      "additionalProperties": true
    }
  },
  "additionalProperties": true
};


let validateOnUpdateSchema;
try {
    validateOnUpdateSchema = ajv.compile(onUpdateSchema);
    // logger.info({ message: "ONDC /on_update schema compiled successfully." });
} catch (err) {
    logger.error({
        message: "FATAL: Failed to load or compile ONDC /on_update JSON schema.",
        error: err.message
    });
    validateOnUpdateSchema = null;
}

const onUpdateMiddleware = async (req, res, next) => {
    const transactionId = req.body?.context?.transaction_id;
    const messageId = req.body?.context?.message_id;

    try {
        const rawBodyBuffer = req.rawBodyBuffer;
        if (!rawBodyBuffer || rawBodyBuffer.length === 0) {
            logger.error({ message: "Raw request body not available for signature verification.", transactionId, messageId });
            return res.status(500).json(createNackResponse({
                type: "CORE_ERROR",
                code: "50002",
                message: "Internal Server Error: Raw body capture failed.",
            }));
        }

        if (!validateOnUpdateSchema) {
            logger.error({ message: "Schema validator unavailable for /on_update.", transactionId, messageId });
            return res.status(500).json(createNackResponse({
                type: "CORE_ERROR",
                code: "50001",
                message: "Schema validation is not available.",
            }));
        }

        const isSchemaValid = validateOnUpdateSchema(req.body);
        if (!isSchemaValid) {
            const error = validateOnUpdateSchema.errors?.[0];
            logger.warn({
                message: "Schema validation failed for /on_update.",
                errors: validateOnUpdateSchema.errors,
                transactionId,
                messageId,
            });
            return res.status(400).json(createNackResponse({
                type: "DOMAIN_ERROR",
                code: "40001",
                message: `Schema validation failed: ${error?.instancePath || 'body'} ${error?.message || ''}`,
            }));
        }
        logger.debug({ message: "Schema validation passed for /on_update", transactionId, messageId });

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.warn({ message: "Missing Authorization header", transactionId, messageId });
            return res.status(401).json(createNackResponse({
                type: "AUTH_ERROR",
                code: "40101",
                message: "Missing Authorization header",
            }));
        }

        const parsedHeader = parseAuthorizationHeader(authHeader);
        const requiredHeaders = ["(created)", "(expires)", "digest"];

        const headerValid = parsedHeader
            && parsedHeader.algorithm === "ed25519"
            && parsedHeader.headers
            && requiredHeaders.every(h => parsedHeader.headers.includes(h));

        if (!headerValid) {
            logger.warn({ message: "Invalid or malformed Authorization header", header: authHeader, parsed: parsedHeader, transactionId, messageId });
            return res.status(401).json(createNackResponse({
                type: "AUTH_ERROR",
                code: "40102",
                message: "Invalid or malformed Authorization header",
            }));
        }

        const { created, expires, signature, keyId } = parsedHeader;
        if (!validateTimestamps(created, expires)) {
            logger.warn({ message: "Authorization timestamp invalid or expired", created, expires, transactionId, messageId });
            return res.status(401).json(createNackResponse({
                type: "AUTH_ERROR",
                code: "40103",
                message: "Authorization timestamp invalid or expired",
            }));
        }

        const { subscriberId: snp_id, uniqueKeyId } = parseKeyId(keyId);
        if (!snp_id || !uniqueKeyId) {
            logger.warn({ message: "Invalid keyId format in Authorization header", keyId, transactionId, messageId });
            return res.status(401).json(createNackResponse({
                type: "AUTH_ERROR",
                code: "40104",
                message: "Invalid keyId format",
            }));
        }

        logger.debug({ message: "Parsed keyId successfully", snp_id, uniqueKeyId, transactionId, messageId });

        const publicKey = await lookupPublicKey(snp_id, uniqueKeyId);
        if (!publicKey) {
            logger.warn({ message: "Public key not found for SNP ID in registry", snp_id, uniqueKeyId, transactionId, messageId });
            return res.status(401).json(createNackResponse({
                type: "AUTH_ERROR",
                code: "40105",
                message: "Public key not found for sending SNP",
            }));
        }

        const isVerified = await verifySignature(signature, created, expires, rawBodyBuffer, publicKey);
        if (!isVerified) {
            logger.warn({ message: "Signature verification failed for /on_update request", snp_id, transactionId, messageId });
            return res.status(401).json(createNackResponse({
                type: "AUTH_ERROR",
                code: "40106",
                message: "Signature verification failed",
            }));
        }

        req.verified_snp_id = snp_id;

        logger.info({ message: "/on_update payload authenticated and validated successfully", snp_id, transactionId, messageId });
        next();

    } catch (error) {
        logger.error({ message: "Unexpected error in onUpdateMiddleware", error: error.message, stack: error.stack, transactionId, messageId });
        return res.status(500).json(createNackResponse({
            type: "CORE_ERROR",
            code: "50000",
            message: "Internal server error during request processing",
        }));
    }
};

export default onUpdateMiddleware;
