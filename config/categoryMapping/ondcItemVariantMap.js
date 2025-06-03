// mappings for product models/names to their respective ONDC variants
export const ondcItemVariantMap = {
    // Mobile Phones
    "iPhone": "V1",
    "iPhone 14": "V2",
    "HTC Touch HD": "V3",
    "Palm Treo Pro": "V4",
    
    // Laptops & Computers
    "MacBook": "V5",
    "MacBook Air": "V6",
    "MacBook Pro": "V7",
    "Sony VAIO": "V8",
    "iMac": "V9",
    
    // Monitors
    "Apple Cinema 30\"": "V10",
    "Samsung SyncMaster 941BW": "V11",
    "HP LP3065": "V12",
    
    // Tablets
    "Samsung Galaxy Tab 10.1": "V13",
    
    // Cameras
    "Canon EOS 5D": "V14",
    "Nikon D300": "V15",
    
    // Audio Devices
    "iPod Classic": "V16",
    "iPod Nano": "V17",
    "iPod Shuffle": "V18",
    "iPod Touch": "V19",
    
    // Accessories
    "Product 8": "V20",
    "bag": "V21",
    
    // Model code specific mappings (shorthand codes)
    "AIPC30": "V10",  // Apple Cinema 30"
    "IP14": "V2",     // iPhone 14
    
    // Handle normalized keys if needed - use normalize() function
    // These should match the normalize() function implementation in your code
    "apple cinema 30": "V10",
    "canon eos 5d": "V14",
    "hp lp3065": "V12",
    "htc touch hd": "V3"
  };
  
  // Helper function to normalize product names for consistent variant mapping
  export function normalizeProductName(productName) {
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, "")
      .trim();
  }
  
  // Helper function to get variant ID from product name
  export function getVariantIdForProduct(productName, productModel) {
    // First try exact match
    if (ondcItemVariantMap[productName]) {
      return ondcItemVariantMap[productName];
    }
    
    // Then try model code if available
    if (productModel && ondcItemVariantMap[productModel]) {
      return ondcItemVariantMap[productModel];
    }
    
    // Try normalized name
    const normalizedName = normalizeProductName(productName);
    if (ondcItemVariantMap[normalizedName]) {
      return ondcItemVariantMap[normalizedName];
    }
    
    // Default fallback based on product type
    if (productName.toLowerCase().includes('phone')) return "V1";
    if (productName.toLowerCase().includes('laptop')) return "V5";
    if (productName.toLowerCase().includes('camera')) return "V14";
    
    // Default
    return "V0";
  }