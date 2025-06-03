import crypto from 'crypto';
import sodium from 'sodium-native';
import logger from '../utils/logger.js';
import { ONDC_DEFAULTS } from '../config/ondcConfig.js';

/**
 * Sign a request payload for ONDC
 */
const signRequest = (payload) => {
  try {
    const privateKey = process.env.ONDC_SIGNING_PRIVATE_KEY;
    if (!privateKey) throw new Error('Signing private key not configured');

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadBuffer = Buffer.from(payloadString, 'utf8');

    // Blake2b hash
    const hash = generateBlake2bHash(payloadBuffer);
    const digest = hash.toString('base64');

    // Ed25519 signature
    const privateKeyBuffer = Buffer.from(privateKey, 'base64');
    const signature = Buffer.alloc(sodium.crypto_sign_BYTES);
    sodium.crypto_sign_detached(signature, payloadBuffer, privateKeyBuffer);

    const created = Math.floor(Date.now() / 1000);
    const expires = created + 300;
    const keyId = `${process.env.ONDC_SUBSCRIPTION_ID}|${process.env.ONDC_UK_ID || ONDC_DEFAULTS.UK_ID}|ed25519`;

    const authHeader = `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature.toString('base64')}",digest="${digest}"`;

    return { signature: signature.toString('base64'), digest, authHeader };
  } catch (error) {
    logger.error('Error signing request', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Verify a request payload
 */
const verifySignature = async (body, signature, providedDigest, publicKey) => {
  try {
    // Generate hash from body
    const hashBuffer = generateBlake2bHash(body);
    const calculatedDigest = hashBuffer.toString('base64');

    // Verify digest
    if (providedDigest !== calculatedDigest) {
      logger.warn('Digest mismatch', { 
        providedDigest, 
        calculatedDigestPreview: calculatedDigest.slice(0, 20) + '...' 
      });
      return false;
    }

    // Verify signature
    const publicKeyBuffer = Buffer.from(publicKey, 'base64');
    const signatureBuffer = Buffer.from(signature, 'base64');
    
    return sodium.crypto_sign_verify_detached(
      signatureBuffer,
      hashBuffer,
      publicKeyBuffer
    );
  } catch (error) {
    logger.error('Error during signature verification', { 
      error: error.message,
      stack: error.stack 
    });
    return false;
  }
};

/**
 * Generate a new Ed25519 key pair
 */
const generateKeyPair = () => {
  try {
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
    const privateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
    
    sodium.crypto_sign_keypair(publicKey, privateKey);
    
    return {
      publicKey: publicKey.toString('base64'),
      privateKey: privateKey.toString('base64')
    };
  } catch (error) {
    logger.error('Error generating key pair', { error: error.message });
    throw error;
  }
};

/**
 * Generate a new X25519 key pair
 */
const generateX25519KeyPair = () => {
  try {
    const publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES);
    const privateKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES);
    sodium.crypto_box_keypair(publicKey, privateKey);

    return {
      publicKey: publicKey.toString('base64'),
      privateKey: privateKey.toString('base64')
    };
  } catch (error) {
    logger.error('Error generating X25519 key pair', { error: error.message });
    throw error;
  }
};

/**
 * Helpers
 */
const generateBlake2bHash = (data) => {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const hash = Buffer.alloc(sodium.crypto_generichash_BYTES);
  sodium.crypto_generichash(hash, buffer);
  return hash;
};

export { signRequest, verifySignature, generateKeyPair, generateX25519KeyPair };
