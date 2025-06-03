
export const MOCK_RESPONSES = {
  // Success responses
  success: {
    message: {
      ack: {
        status: 'ACK'
      }
    }
  },

  // Error responses
  error: {
    error: {
      type: 'PROTOCOL-ERROR',
      code: '40001',
      message: 'Invalid request'
    }
  },

  // Custom responses
  custom: {
    // Add custom responses here
  }
};

export const getMockResponse = (type = 'success', customData = {}) => {
  const baseResponse = MOCK_RESPONSES[type] || MOCK_RESPONSES.success;
  return {
    ...baseResponse,
    ...customData
  };
};

export const createMockResponse = (data) => {
  return {
    message: {
      ack: {
        status: 'ACK'
      },
      ...data
    }
  };
}; 