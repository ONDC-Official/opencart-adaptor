// Mapping OpenCart category IDs to ONDC category names
export const openCartToOndcCategoryMap = {
    // OpenCart category IDs mapping to category names
    "20": "Desktop",
    "18": "Laptop",
    "24": "Mobile Phone",
    "33": "Camera",
    "17": "Software",
    "25": "Component",
    "28": "Monitor",
    "34": "Tablet",
    "29": "Mouse",
    "31": "Scanner",
    "30": "Printer",
    "32": "Web Camera",
    "27": "Mac",
    "26": "Audio Device",
    
    // Handle category names directly for compatibility
    "Desktops": "Desktop",
    "Laptops & Notebooks": "Laptop",
    "Phones & PDAs": "Mobile Phone",
    "Monitors": "Monitor",
    "Tablets": "Tablet",
    "MP3 Players": "Audio Accessories",
    "Cameras": "Camera",
    "Components": "Computer Component",
    "Printers": "Printer",
    "Software": "Computer Software",
    "Mac": "Laptop",
    "iPod Touch": "Audio Accessories",
    "iPod Shuffle": "Audio Accessories",
    "iPod Classic": "Audio Accessories",
    "iPod Nano": "Audio Accessories",
  
    "Canon EOS 5D": "Camera",
    "Nikon D300": "Camera",
  
    "iMac": "Desktop"
  };
  
  // Fallback function to get ONDC category from product name when category is missing
  export function getOndcCategoryFromProductName(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('phone') || name.includes('iphone') || name.includes('htc') || name.includes('palm treo')) {
      return "Mobile Phone";
    } else if (name.includes('macbook') || name.includes('vaio') || name.includes('laptop')) {
      return "Laptop";
    } else if (name.includes('desktop') || name.includes('imac')) {
      return "Desktop";
    } else if (name.includes('tablet') || name.includes('galaxy tab')) {
      return "Tablet";
    } else if (name.includes('monitor') || name.includes('cinema') || name.includes('lp3065') || name.includes('syncmaster')) {
      return "Monitor";
    } else if (name.includes('camera') || name.includes('eos') || name.includes('nikon')) {
      return "Camera";
    } else if (name.includes('ipod')) {
      return "Audio Accessories";
    } else if (name.includes('bag')) {
      return "Laptop Bag";
    } else {
      return "Computer Accessories"; // Default fallback
    }
  }