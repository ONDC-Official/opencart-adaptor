import Ajv from "ajv";
import crypto from "crypto";
import logger from "./logger.js";

const ajv = new Ajv();

// Basic schema
const confirmSchema = {
  type: 'object',
  properties: {
    context: {
      type: 'object',
      properties: {
        domain: { type: 'string' },
        country: { type: 'string' },
        city: { type: 'string' },
        action: { type: 'string' },
        core_version: { type: 'string' },
        bap_id: { type: 'string' },
        transaction_id: { type: 'string' }
      },
      required: ['domain', 'action', 'core_version', 'bap_id', 'transaction_id']
    },
    message: { type: 'object' }
  },
  required: ['context', 'message']
};

export const validateConfirmBody = ajv.compile(confirmSchema);

export function parseAuthorizationHeader(authHeader) {
  if (!authHeader.startsWith('Signature ')) return null;

  const params = {};
  const parts = authHeader.slice(9).split(',');

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    params[key] = value.replace(/(^"|"$)/g, '');
  }

  return params;
}

export function isTimestampValid(created, expires, skew = 300) {
  const now = Math.floor(Date.now() / 1000);
  return (created <= now + skew) && (expires >= now - skew);
}

export function createSignatureBaseString(params, headersList, rawBody) {
  const headers = headersList.split(' ');
  let signatureString = '';

  for (const header of headers) {
    switch (header.toLowerCase()) {
      case '(created)':
        signatureString += `(created): ${params.created}\n`;
        break;
      case '(expires)':
        signatureString += `(expires): ${params.expires}\n`;
        break;
      case 'digest':
        const hash = crypto.createHash('sha256').update(rawBody).digest('base64');
        signatureString += `digest: BLAKE-512=${hash}\n`;
        break;
      default:
        throw new Error(`Unsupported signature header: ${header}`);
    }
  }

  return signatureString.trim();
}

// Hardcoded Public Key - REPLACE WITH THE ACTUAL PUBLIC KEY FOR TESTING ONLY
// const HARDCODED_PUBLIC_KEY = "PASTE_THE_SENDER'S_PUBLIC_KEY_HERE";

export async function verifyOndcSignature(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return false;
    }

    const parsedHeader = parseAuthorizationHeader(authHeader);
    if (!parsedHeader) {
      logger.warn('Invalid Authorization header format');
      return false;
    }

    const { created, expires, signature, keyId } = parsedHeader;
    if (!validateTimestamps(created, expires)) {
      logger.warn('Authorization timestamp invalid or expired');
      return false;
    }

    const { subscriberId, uniqueKeyId } = parseKeyId(keyId);
    if (!subscriberId || !uniqueKeyId) {
      logger.warn('Invalid keyId format');
      return false;
    }

    const publicKey = await lookupPublicKey(subscriberId, uniqueKeyId);
    if (!publicKey) {
      logger.warn('Public key not found for subscriber');
      return false;
    }

    const isVerified = await verifySignature(signature, created, expires, req.rawBodyBuffer, publicKey);
    if (!isVerified) {
      logger.warn('Signature verification failed');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error during signature verification:', error);
    return false;
  }
}

export async function verifySignature(signature, created, expires, rawBodyBuffer, publicKey) {
  try {
    const signatureBaseString = createSignatureBaseString(
      { created, expires },
      '(created) (expires) digest',
      rawBodyBuffer
    );

    // For ed25519, we need to use the appropriate algorithm
    const isVerified = crypto.verify(
      'ed25519',
      Buffer.from(signatureBaseString),
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      Buffer.from(signature, 'base64')
    );

    return isVerified;
  } catch (error) {
    logger.error('Error during signature verification:', error);
    return false;
  }
}

export function parseKeyId(keyId) {
  // Handle ONDC keyId format: "subscriber_id|unique_key_id|algorithm"
  const parts = keyId.split('|');
  if (parts.length < 2) {
    return { subscriberId: null, uniqueKeyId: null };
  }
  // Return first two parts, ignoring algorithm if present
  return { 
    subscriberId: parts[0], 
    uniqueKeyId: parts[1]
  };
}

export function validateTimestamps(created, expires, skew = 300) {
  const now = Math.floor(Date.now() / 1000);
  return (created <= now + skew) && (expires >= now - skew);
}

// --- ADDED FUNCTION: createNackResponse ---
export const createNackResponse = (error) => {
  return {
    context: {
      // You might need to populate context details based on the original request
    },
    error: {
      type: error.type || 'APPLICATION-ERROR',
      code: error.code || '50000',
      message: error.message || 'Generic error',
    },
  };
};

// You might need to add the implementation for lookupRegistryPublicKey here
// OR import it from registryService.js as discussed.
// If you keep it here, ensure it's using ESM syntax and exported.
// Example (you will need to implement the actual logic):
// export async function lookupRegistryPublicKey(subscriberId, uniqueKeyId) {
//   // Implementation to fetch public key from the registry
//   // This might involve network calls using 'fetch' or 'axios'
//   console.log('Placeholder for lookupRegistryPublicKey');
//   return null; // Replace with actual fetched public key or null if not found
// }