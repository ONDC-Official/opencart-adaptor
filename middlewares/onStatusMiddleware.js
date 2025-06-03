
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { verifyOndcSignature } from '../utils/ondcUtils.js';
import logger from '../utils/logger.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let validate;

/**
 * Loads and compiles the JSON schema synchronously.
 */
const loadSchema = () => {
  try {
    const schemaPath = path.resolve('./utils/schemas/on_status.json');
    const schemaData = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    validate = ajv.compile(schemaData);
  } catch (err) {
    logger.error({
      message: 'Failed to load JSON schema',
      error: err,
    });
    validate = null;
  }
};

/**
 * Middleware to authenticate and validate /on_status requests.
 */
const processOnStatusRequest = async (req, res, next) => {
  if (!validate) {
    loadSchema();
    if (!validate) {
      return res.status(500).json({
        context: req.body?.context || {},
        message: { ack: { status: 'NACK' } },
        error: {
          type: 'INTERNAL-ERROR',
          code: '50001',
          message: 'Server failed to load validation schema.',
        },
      });
    }
  }

  const { body } = req;
  const transactionId = body?.context?.transaction_id;
  const messageId = body?.context?.message_id;

  logger.info({
    message: 'Received /on_status request',
    transactionId,
    messageId,
    payload: body,
  });

  // Schema validation
  const isValid = validate(body);
  if (!isValid) {
    const errorMessages = validate.errors
      .map(e => `${e.instancePath || 'body'}: ${e.message}`)
      .join(', ');

    logger.error({
      message: 'Schema validation failed',
      errors: validate.errors,
      payload: body,
      transactionId,
      messageId,
    });

    return res.status(400).json({
      context: body.context,
      message: { ack: { status: 'NACK' } },
      error: {
        type: 'JSON-SCHEMA-ERROR',
        code: '50009',
        message: `Payload failed schema validation: ${errorMessages}`,
      },
    });
  }

  // Skip auth in dev mode
  if (process.env.SKIP_AUTH === 'true' || req.headers['x-dev-mode'] === 'true') {
    logger.warn({
      message: 'Authorization skipped in development mode',
      transactionId,
      messageId,
    });
    return next();
  }

  // Signature verification
  const verified = await verifyOndcSignature(req);
  if (!verified) {
    logger.warn({
      message: 'Signature verification failed',
      transactionId,
      messageId,
      headers: req.headers,
    });

    return res.status(401).json({
      context: body.context,
      message: { ack: { status: 'NACK' } },
      error: {
        type: 'CONTEXT-ERROR',
        code: '10001',
        message: 'Request signature verification failed. Please ensure the request includes a valid Authorization header.',
      },
    });
  }

  next();
};

export { processOnStatusRequest };
