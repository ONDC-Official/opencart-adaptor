/**
 * Creates a standard ACK (acknowledgement) response for ONDC.
 * @param {object} [context] Optional context object to include in the ACK.
 * @returns {object} The ACK response object.
 */
export const sendAck = (context) => {
    return {
      context: {
        transaction_id: context?.transaction_id,
        message_id: context?.message_id,
        // You might want to include other relevant context parameters
        ...context,
      },
      message: {
        ack: {
          status: 'ACK',
        },
      },
    };
  };
  
  /**
   * Creates a standard NACK (negative acknowledgement) response for ONDC.
   * @param {string} message The reason for the NACK.
   * @param {object} [context] Optional context object to include in the NACK.
   * @param {object} [error] Optional error object with `type`, `code`, and `message`.
   * @returns {object} The NACK response object.
   */
  export const sendNack = (message, context, error) => {
    return {
      context: {
        transaction_id: context?.transaction_id,
        message_id: context?.message_id,
        // You might want to include other relevant context parameters
        ...context,
      },
      message: {
        ack: {
          status: 'NACK',
        },
      },
      error: {
        type: error?.type || 'APPLICATION-ERROR',
        code: error?.code || '50000',
        message: error?.message || message || 'Error occurred',
      },
    };
  };
  
  export default { sendAck, sendNack };
