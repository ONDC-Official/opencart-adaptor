import axios from 'axios';
import { ONDC_DEFAULTS } from '../config/ondcConfig.js';
import logger from './logger.js';

export const lookupPublicKeyByUkId = async (ukId) => {
  try {
    const response = await axios.post(
      `${process.env.ONDC_REGISTRY_URL || ONDC_DEFAULTS.REGISTRY_URL}/lookup`,
      {
        subscriber_id: process.env.ONDC_SUBSCRIPTION_ID,
        ukId,
        domain: process.env.ONDC_DOMAIN || ONDC_DEFAULTS.DOMAIN,
        country: process.env.ONDC_COUNTRY || ONDC_DEFAULTS.COUNTRY,
        city: process.env.ONDC_CITY || ONDC_DEFAULTS.CITY,
        type: "BPP"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ONDC_AUTH_TOKEN}`
        }
      }
    );

    if (!response.data || !Array.isArray(response.data)) {
      logger.warn('Invalid response format from registry', { ukId });
      return null;
    }

    const subscriber = response.data.find(entry => entry.ukId === ukId);
    if (!subscriber) {
      logger.warn('Subscriber not found in registry response', {
        ukId,
        subscriberId: process.env.ONDC_SUBSCRIPTION_ID
      });
      return null;
    }

    return subscriber.signing_public_key || null;

  } catch (error) {
    logger.error('Error looking up public key', {
      ukId,
      subscriberId: process.env.ONDC_SUBSCRIPTION_ID,
      error: error.message
    });
    return null;
  }
};

export const verifyPublicKey = async (ukId, publicKey) => {
  try {
    const registryKey = await lookupPublicKeyByUkId(ukId);
    if (!registryKey) {
      logger.warn('Could not verify key - registry lookup failed', {
        ukId,
        subscriberId: process.env.ONDC_SUBSCRIPTION_ID
      });
      return false;
    }

    return registryKey === publicKey;
  } catch (error) {
    logger.error('Error verifying public key', {
      ukId,
      subscriberId: process.env.ONDC_SUBSCRIPTION_ID,
      error: error.message
    });
    return false;
  }
};

export default {
  lookupPublicKeyByUkId,
  verifyPublicKey
};