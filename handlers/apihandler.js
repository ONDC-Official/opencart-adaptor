import { verifySignature } from '../auth/cryptoUtils.js';
import { lookupSubscriber } from '../auth/registryService.js';
import logger from '../utils/logger.js';

const apiHandler = async (req, res, next) => {
  try {
    // Store raw body for signature verification
    req.rawBody = JSON.stringify(req.body);

    const isDevMode = req.headers['x-dev-mode'] === 'true';
    if (isDevMode) {
      logger.info('🛠 Developer mode enabled – skipping signature verification');
      // In dev mode, we still need to validate the request body
      if (!req.body || !req.body.context || !req.body.message) {
        logger.warn('Invalid request body in dev mode', { body: req.body });
        return res.status(400).json({
          error: {
            type: "PROTOCOL-ERROR",
            code: "40001",
            message: "Invalid request body format"
          }
        });
      }
      // Set verified BAP ID for dev mode
      req.verified_bap_id = req.body.context.bap_id || 'dev-mode-bap';
      return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return res.status(401).json({ 
        error: {
          type: "PROTOCOL-ERROR",
          code: "40101",
          message: "Missing Authorization header"
        }
      });
    }

    const authParams = parseAuthHeader(authHeader);
    if (!authParams) {
      logger.warn('Invalid Authorization header format', { header: authHeader });
      return res.status(401).json({ 
        error: {
          type: "PROTOCOL-ERROR",
          code: "40102",
          message: "Invalid Authorization header format"
        }
      });
    }

    const { ukId, signature, digest, created, expires } = authParams;

    // Validate timestamps
    const now = Math.floor(Date.now() / 1000);
    if (Number(created) > now) {
      return res.status(401).json({ 
        error: {
          type: "PROTOCOL-ERROR",
          code: "40103",
          message: "Invalid created timestamp"
        }
      });
    }
    if (Number(expires) < now) {
      return res.status(401).json({ 
        error: {
          type: "PROTOCOL-ERROR",
          code: "40104",
          message: "Signature expired"
        }
      });
    }

    // Lookup subscriber and verify signature
    const subscriber = await lookupSubscriber('*', ukId);
    if (!subscriber || !subscriber.signing_public_key) {
      logger.warn('Public key not found for ukId', { ukId });
      return res.status(401).json({ 
        error: {
          type: "PROTOCOL-ERROR",
          code: "40105",
          message: "Public key not found for ukId"
        }
      });
    }

    const isVerified = await verifySignature(req.rawBody, signature, digest, subscriber.signing_public_key);
    
    if (!isVerified) {
      logger.warn('Signature verification failed', { ukId });
      return res.status(401).json({ 
        error: {
          type: "PROTOCOL-ERROR",
          code: "40106",
          message: "Invalid signature"
        }
      });
    }

    // Set verified BAP ID from subscriber
    req.verified_bap_id = subscriber.subscriber_id;
    logger.info('Signature verified successfully', { ukId });
    next();
  } catch (error) {
    logger.error('Error in API handler', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: {
        type: "CORE-ERROR",
        code: "50000",
        message: "Internal server error during authentication"
      }
    });
  }
};

const parseAuthHeader = (authHeader) => {
  try {
    if (!authHeader.startsWith('Signature ')) {
      logger.warn('Invalid Authorization header format - missing Signature prefix');
      return null;
    }

    const parts = authHeader.slice(10).match(/(\w+)="([^"]+)"/g);
    if (!parts) {
      logger.warn('Invalid Authorization header format - malformed parameters');
      return null;
    }

    const parsed = Object.fromEntries(
      parts.map(p => p.split('=').map(x => x.replace(/"/g, '')))
    );

    // Validate required fields
    const requiredFields = ['keyId', 'algorithm', 'signature', 'created', 'expires', 'headers', 'digest'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    if (missingFields.length > 0) {
      logger.warn('Missing required fields in Authorization header', { missingFields });
      return null;
    }

    // Validate algorithm
    if (parsed.algorithm !== 'ed25519') {
      logger.warn('Unsupported signature algorithm', { algorithm: parsed.algorithm });
      return null;
    }

    // Extract ukId from keyId
    const [, ukId] = parsed.keyId.split('|');
    if (!ukId) {
      logger.warn('Invalid keyId format', { keyId: parsed.keyId });
      return null;
    }

    return {
      ukId,
      algorithm: parsed.algorithm,
      signature: parsed.signature,
      digest: parsed.digest,
      created: parsed.created,
      expires: parsed.expires,
      headers: parsed.headers
    };
  } catch (error) {
    logger.error('Error parsing Authorization header', { error: error.message });
    return null;
  }
};

export default apiHandler;
