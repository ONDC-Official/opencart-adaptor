import axios from 'axios';
import { ONDC_DEFAULTS } from '../config/ondcConfig.js';

/**
 * Looks up a gateway subscriber in the ONDC Registry based on their subscriber ID (e.g., BAP ID).
 * @param {string} subscriberId The subscriber ID to lookup.
 * @param {string} [type='BAP'] The type of subscriber to lookup (e.g., 'BAP', 'BPP'). Defaults to 'BAP'.
 * @returns {Promise<object|null>} The subscriber object from the registry if found and subscribed, otherwise null.
 */
export const lookupGatewaySubscriber = async (subscriberId, type = 'BAP') => {
  try {
    const registryUrl = process.env.ONDC_REGISTRY_URL || ONDC_DEFAULTS.REGISTRY_URL;
    const response = await axios.get(`${registryUrl}/lookup`, {
      params: {
        subscriber_id: subscriberId,
        type: type
      }
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const subscriber = response.data[0];
      if (subscriber.status === 'SUBSCRIBED' && subscriber.roles.includes(type)) {
        return subscriber;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error looking up ${type} subscriber '${subscriberId}' in registry:`, error.message);
    return null;
  }
};

/**
 * Looks up the callback URI of a subscribed entity from the ONDC Registry.
 * @param {object} subscriber The subscriber object obtained from the registry.
 * @returns {string|null} The callback URI if found, otherwise null.
 */
export const lookupRegistryCallbackUri = (subscriber) => {
  if (subscriber && subscriber.subscriber_url) {
    return subscriber.subscriber_url;
  }
  return null;
};

/**
 * Looks up the signing public key of a subscriber from the ONDC Registry.
 * @param {string} subscriberId The subscriber ID.
 * @param {string} keyId The unique key ID.
 * @param {string} [type='BPP'] The type of subscriber to lookup (e.g., 'BAP', 'BPP'). Defaults to 'BPP'.
 * @returns {Promise<string|null>} The signing public key if found, otherwise null.
 */
export const lookupPublicKey = async (subscriberId, keyId, type = 'BPP') => {
  try {
    const registryUrl = process.env.ONDC_REGISTRY_URL || ONDC_DEFAULTS.REGISTRY_URL;
    const response = await axios.get(`${registryUrl}/lookup`, {
      params: {
        subscriber_id: subscriberId,
        key_id: keyId,
        type: type
      }
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const subscriber = response.data[0];
      return subscriber.signing_public_key || null;
    }
    return null;
  } catch (error) {
    console.error(`Error looking up public key for ${type} subscriber '${subscriberId}' with key ID '${keyId}':`, error.message);
    return null;
  }
};
export default { lookupGatewaySubscriber, lookupRegistryCallbackUri, lookupPublicKey };