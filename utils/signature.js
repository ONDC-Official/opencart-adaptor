import crypto from 'crypto';
import { ONDC_DEFAULTS } from '../config/ondcConfig.js';


const privateKey = process.env.ONDC_SIGNING_PRIVATE_KEY;
if (!privateKey) throw new Error('Signing private key not configured');

export function sign(data) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  return sign.sign(privateKey, 'base64');
}

export function verify(data, signature, publicKey) {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  return verify.verify(publicKey, signature, 'base64');
}

export default { sign, verify };