
import he from 'he';
import { categoryMap } from "../config/categoryMapping/categoryMap.js";
import { openCartToOndcCategoryMap } from "../config/categoryMapping/openCartToOndcCategoryMap.js";
import { ondcItemVariantMap } from "../config/categoryMapping/ondcItemVariantMap.js";
import { DEFAULT_CATEGORY_ID } from "../config/constants.js";

/**
 * Normalize a string for consistent mapping
 * @param {string} str - Input string to normalize
 * @returns {string} - Normalized string
 */
export function normalize(str) {
  return he.decode(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+$/, "") 
    .replace(/^_+/, "")
    .replace(/\*/g, "")
    .trim();
}

/**
 * Infer ONDC category from product name when other mappings fail
 * @param {string} productName - Product name to analyze
 * @returns {string} - Best guess category name
 */
export function inferCategoryFromName(productName) {
  if (!productName) return "Computer Accessories";
  
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

/**
 * Map OpenCart product to ONDC category ID
 * @param {Object} product - OpenCart product object
 * @returns {Object} - Mapping result with category info
 */
export function mapProductToOndcCategory(product) {
  const categoryId = product.categories?.[0]?.id;
  const categoryName = he.decode(product.category_name || "").trim();
  const productName = he.decode(product.name || "").trim();
  
  // Try mapping by category ID first
  let ondcCategory = openCartToOndcCategoryMap[categoryId];
  
  // If that fails, try mapping by category name
  if (!ondcCategory && categoryName) {
    ondcCategory = openCartToOndcCategoryMap[categoryName];
  }
  
  // If both fail, infer from product name
  if (!ondcCategory && productName) {
    ondcCategory = inferCategoryFromName(productName);
  }
  
  // Get the category ID from the category name
  const mappedCategoryId = categoryMap[ondcCategory] || DEFAULT_CATEGORY_ID;
  
  return {
    ondcCategory,
    mappedCategoryId
  };
}

/**
 * Get variant ID for a product
 * @param {Object} product - OpenCart product object
 * @returns {string|null} - ONDC variant ID or null if not found
 */
export function getVariantIdForProduct(product) {
  if (!product) return null;
  
  // Try direct mapping from model code
  if (product.model && ondcItemVariantMap[product.model]) {
    return ondcItemVariantMap[product.model];
  }
  
  // Try product name exact match
  const name = he.decode(product.name || "").trim();
  if (name && ondcItemVariantMap[name]) {
    return ondcItemVariantMap[name];
  }
  
  // Try normalized name
  const normalizedName = normalize(name);
  if (normalizedName && ondcItemVariantMap[normalizedName]) {
    return ondcItemVariantMap[normalizedName];
  }
  
  // Fallback based on product type
  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('phone') || lowerName.includes('htc') || lowerName.includes('iphone')) return "V1";
    if (lowerName.includes('macbook') || lowerName.includes('laptop')) return "V5";
    if (lowerName.includes('camera')) return "V14";
    if (lowerName.includes('monitor')) return "V10";
    if (lowerName.includes('ipod')) return "V16";
  }
  
  // Default generic variant
  return "V0";
}
