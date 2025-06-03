// utils/verifyHeader.js

import { parseAuthorizationHeader, validateTimestamps } from "./ondcUtils.js";
import logger from "./logger.js";

/**
 * Verifies Authorization header for outgoing ONDC APIs like /update, /cancel, etc.
 * 
 * @param {object} req - Express request object
 * @param {string} action - Action type, like 'update', 'cancel'
 * @returns {Promise<{headerSignature: object, bppId: string}>}
 * @throws Error if verification fails
 */
export default async function verifyHeader(req, action) {
  const transactionId = req.body?.context?.transaction_id;
  const messageId = req.body?.context?.message_id;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.warn({ message: `Missing Authorization header for /${action}`, transactionId, messageId });
    throw new Error("Missing Authorization header");
  }

  const parsedHeader = parseAuthorizationHeader(authHeader);
  if (!parsedHeader) {
    logger.warn({ message: `Malformed Authorization header for /${action}`, transactionId, messageId, header: authHeader });
    throw new Error("Malformed Authorization header");
  }

  const requiredHeaders = ["(created)", "(expires)", "digest"];
  const { created, expires, keyId } = parsedHeader;

  const headerValid =
    parsedHeader.algorithm === "ed25519" &&
    parsedHeader.headers &&
    requiredHeaders.every((h) => parsedHeader.headers.includes(h));

  if (!headerValid) {
    logger.warn({ message: `Invalid Authorization header fields for /${action}`, transactionId, messageId, parsedHeader });
    throw new Error("Invalid Authorization header fields");
  }

  if (!validateTimestamps(created, expires)) {
    logger.warn({ message: `Authorization header timestamps invalid for /${action}`, transactionId, messageId, created, expires });
    throw new Error("Authorization timestamps invalid");
  }

  const { subscriberId: bppId } = keyId ? parseKeyId(keyId) : {};

  if (!bppId) {
    logger.warn({ message: `Invalid keyId format inside Authorization header for /${action}`, transactionId, messageId, keyId });
    throw new Error("Invalid keyId format in Authorization header");
  }

  logger.debug({ message: `Authorization header validated successfully for /${action}`, transactionId, messageId, bppId });

  return { headerSignature: parsedHeader, bppId };
}
