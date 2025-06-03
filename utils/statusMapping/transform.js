// utils/transform.js

function mapOrderStatusToFulfillment(orderStatusId) {
    const map = {
      1: 'Created',     // Pending
      2: 'In-progress', // Processing
      3: 'In-progress', // Shipped
      5: 'Completed',   // Complete
      7: 'Cancelled',   // Canceled
      15: 'In-progress' // Processed
    };
    return map[orderStatusId] || 'In-progress';
  }
  
  export function buildOnStatusPayload(context, orderDetails) {
    const fulfillmentStatus = mapOrderStatusToFulfillment(orderDetails.order_status_id);
    return {
      context: {
        ...context,
        action: 'on_status',
        timestamp: new Date().toISOString(),
      },
      message: {
        order: {
          id: orderDetails.order_id,
          state: fulfillmentStatus,
          fulfillments: [
            {
              id: '1',
              state: { descriptor: { code: fulfillmentStatus } },
              updated_at: new Date(orderDetails.date_modified).toISOString(),
            }
          ]
        }
      }
    };
  }
  
export default { buildOnStatusPayload };
  