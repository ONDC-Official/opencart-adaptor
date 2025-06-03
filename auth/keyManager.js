import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const extractRawKeyFromPem = (pemKey) => {
  return Buffer.from(pemKey.replace(/-----BEGIN .* KEY-----|-----END .* KEY-----|\n/g, ''), 'base64');
};

const generateSigningKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return {
    publicKey: extractRawKeyFromPem(publicKey).toString('base64'),
    privateKey: extractRawKeyFromPem(privateKey).toString('base64')
  };
};

const generateEncryptionKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return {
    publicKey: extractRawKeyFromPem(publicKey).toString('base64'),
    privateKey: extractRawKeyFromPem(privateKey).toString('base64')
  };
};

const loadKeys = () => {
  const keysDir = process.env.KEYS_DIR || './keys';

  const getKey = (envVar, fileName) => {
    return process.env[envVar] || (
      fs.existsSync(path.resolve(keysDir, fileName)) ?
        fs.readFileSync(path.resolve(keysDir, fileName), 'utf8').trim() :
        null
    );
  };

  return {
    signingPublicKey: getKey('ONDC_SIGNING_PUBLIC_KEY', 'signing_public_key.b64'),
    signingPrivateKey: getKey('ONDC_SIGNING_PRIVATE_KEY', 'signing_private_key.b64'),
    encryptionPublicKey: getKey('ONDC_ENCRYPTION_PUBLIC_KEY', 'encryption_public_key.b64'),
    encryptionPrivateKey: getKey('ONDC_ENCRYPTION_PRIVATE_KEY', 'encryption_private_key.b64')
  };
};

export { generateSigningKeyPair, generateEncryptionKeyPair, loadKeys };
