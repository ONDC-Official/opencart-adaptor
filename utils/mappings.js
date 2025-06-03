
/**
 * Convert ONDC order states to OpenCart status IDs.
 * Adjust the numbers to match your OpenCart 'Cancelled', 'Completed', etc.
 */
export function mapOrderStateToStatusId(ondcState) {
    switch (ondcState) {
      case 'Cancelled':
        return 7;    // e.g. your OpenCart "Cancelled" status ID
      case 'Completed':
        return 5;    // e.g. your "Complete" status
      case 'Returned':
        return 8;    // if you have a “Returned” status
      // add more as needed...
      default:
        throw new Error(`Unknown ONDC order state: ${ondcState}`);
    }
  }
  