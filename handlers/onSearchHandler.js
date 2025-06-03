import axios from "axios";
import { JSDOM } from "jsdom";
import { ondcConfig } from "../config/ondcConfig.js";
import { parseAttributesFromDescription } from "../utils/tagsMapping/attributeParser.js";

import { 
  openCartToOndcCategoryMap
} from "../config/categoryMapping/openCartToOndcCategoryMap.js";
import { 
  ondcItemVariantMap, 
} from "../config/categoryMapping/ondcItemVariantMap.js";
import he from 'he';
import { categoryAttributes, ALL_ATTRIBUTES } from "../config/categoryMapping/categoryAttributes.js";
import { getProductDescriptionFromDB, getProductMetadataFromDB } from '../services/db.js'; // make sure path is correct


import { 
    mapProductToOndcCategory, 
    getVariantIdForProduct,
    normalize 
  } from "../utils/categoryMappingHelpers.js";

import {
    BPP_ID,
    BPP_URI,
    DEFAULT_CITY,
    DEFAULT_COURT_JURISDICTION,
    DEFAULT_TAX_NUMBER,
    DEFAULT_PROVIDER_TAX_NUMBER,
    DEFAULT_CONTACT,
    DEFAULT_CATEGORY_ID
  } from "../config/constants.js";
  

function extractExtraFeatures(html, usedKeys = []) {
    if (!html || typeof html !== 'string') return [];
  
    // Decode HTML entities
    const decoded = he.decode(html);
  
    // Parse as DOM
    const dom = new JSDOM(decoded);
    const text = dom.window.document.body.textContent || "";
  
    // Split into lines by punctuation or HTML-ish breaks
    const lines = text
      .split(/[\r\n]+|[.•–-]/) // split on newlines or bullets
      .map(line => line.trim())
      .filter(line =>
        line.length > 5 &&
        !usedKeys.some(k => line.toLowerCase().includes(k.toLowerCase()))
      );
  
    const unique = [...new Set(lines)]; // remove duplicates
  
    return unique.map((line, i) => ({
      code: `feature_${i + 1}`,
      value: line
    }));
  }
  
  function extractTextFromHTML(html) {
    if (!html || typeof html !== 'string') return "";
    const decoded = he.decode(html);
    const dom = new JSDOM(decoded);
    const text = dom.window.document.body.textContent || "";
    return text.trim().replace(/\s+/g, ' ');
  }

export default async function onSearchHandler(req, res) {
    console.log("onSearch handler executed");
    try {
        const payload = req.body;
    
        try {
            const opencartApiUrl = `${process.env.OPENCART_SITE}/index.php?route=api/allproducts&json`;
            const response = await axios.get(opencartApiUrl);
            const opencartProducts = response.data.shop_products;
        
            const opencartApiStoreInfo = `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/contact`;
            const store = await axios.get(opencartApiStoreInfo);
            const storeInfo = store.data;
        
            const opencartApiCategories = `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/categories&json`;
            const categories = await axios.get(opencartApiCategories);
            const categoriesInfo = categories.data;
        
            if (!opencartProducts || opencartProducts.length === 0) {
                return res.json({
                    context: payload.context,
                    error: {
                        type: "DOMAIN-ERROR",
                        code: "40002",
                        message: "No products found"
                    }
                });
            }
            if (!categoriesInfo || categoriesInfo.length === 0) {
                return res.json({
                    context: payload.context,
                    error: {
                        type: "DOMAIN-ERROR",
                        code: "40002",
                        message: "No categories found"
                    }
                });
            }
            if (!storeInfo || storeInfo.length === 0) {
                return res.json({
                    context: payload.context,
                    error: {
                        type: "DOMAIN-ERROR",
                        code: "40002",
                        message: "No store info found"
                    }
                });
            }
        
            const ondcCatalog = {
                context: {
                    domain: payload.context.domain,
                    country: payload.context.country,
                    city: payload.context.city || DEFAULT_CITY,
                    action: payload.context.action,
                    core_version: payload.context.core_version,
                    bap_id: payload.context.bap_id,
                    bap_uri: payload.context.bap_uri,
                    bpp_id: payload.context?.bpp_id,
                    bpp_uri: payload.context?.bpp_uri,
                    transaction_id: payload.context.transaction_id,
                    message_id: payload.context.message_id,
                    timestamp: new Date().toISOString(),
                },
                message: {
                    catalog: {
                        "bpp/fulfillments": ondcConfig.fulfillments,
                        "bpp/descriptor": {
                            name: ondcConfig.bppDescriptor.name,
                            symbol: storeInfo.image,
                            short_desc: ondcConfig.bppDescriptor.short_desc,
                            long_desc: ondcConfig.bppDescriptor.long_desc,
                            images: ondcConfig.bppDescriptor.images,
                            tags: [
                                {
                                    code: "bpp_terms",
                                    list: [
                                        {
                                            code: "np_type",
                                            value: ondcConfig.bppTerms.np_type
                                        },
                                        {
                                            code: "accept_bap_terms",
                                            value: ondcConfig.bppTerms.accept_bap_terms
                                        },
                                        {
                                            code: "collect_payment",
                                            value: ondcConfig.bppTerms.collect_payment
                                        }
                                    ]
                                }
                            ]
                        },
                        "bpp/providers": [
                            {
                                id: ondcConfig.provider.id,
                                time: {
                                    label: "enable",
                                    timestamp: new Date().toISOString()
                                },
                                fulfillments: [
                                    {
                                        id: "F1",
                                        type: "Delivery",
                                        contact: {
                                            phone: storeInfo.telephone,
                                            email: ondcConfig.provider.contact.email
                                        }
                                    },
                                    {
                                        id: "F2",
                                        type: "Self-Pickup",
                                        contact: {
                                            phone: storeInfo.telephone,
                                            email: ondcConfig.provider.contact.email
                                        }
                                    },
                                    {
                                        id: "F3",
                                        type: "Buyer-Delivery",
                                        contact: {
                                            phone: storeInfo.telephone,
                                            email: ondcConfig.provider.contact.email
                                        }
                                    }
                                ],
                                descriptor: {
                                    name: storeInfo.store,
                                    symbol: storeInfo.image,
                                    short_desc: storeInfo.comment || ondcConfig.bppDescriptor.short_desc,
                                    long_desc: ondcConfig.bppDescriptor.long_desc,
                                    images: ondcConfig.bppDescriptor.images
                                },
                                "@ondc/org/fssai_license_no": ondcConfig.provider.fssai_license_no,
                                ttl: ondcConfig.provider.ttl,
                                locations: [
                                    {
                                        id: ondcConfig.location.id,
                                        time: {
                                            label: "enable",
                                            timestamp: new Date().toISOString(),
                                            days: ondcConfig.location.days,
                                            schedule: ondcConfig.location.schedule,
                                            range: ondcConfig.location.range
                                        },
                                        gps: ondcConfig.location.gps,
                                        address: {
                                            locality: storeInfo.address,
                                            street: storeInfo.address,
                                            city: DEFAULT_CITY,
                                            area_code: storeInfo.geocode,
                                            state: ondcConfig.location.state
                                        },
                                        circle: {
                                            gps: ondcConfig.location.gps,
                                            radius: {
                                                unit: "km",
                                                value: "3"
                                            }
                                        }
                                    }
                                ],
                                categories: [],
                                items: [],
                                tags: [
                                    {
                                        code: "bpp_terms",
                                        list: [
                                            {
                                                code: "max_liability",
                                                value: ondcConfig.bppTermsList.max_liability
                                            },
                                            {
                                                code: "max_liability_cap",
                                                value: ondcConfig.bppTermsList.max_liability_cap
                                            },
                                            {
                                                code: "mandatory_arbitration",
                                                value: ondcConfig.bppTermsList.mandatory_arbitration
                                            },
                                            {
                                                code: "court_jurisdiction",
                                                value: ondcConfig.bppTermsList.court_jurisdiction || DEFAULT_COURT_JURISDICTION
                                              },
                                            {
                                                code: "delay_interest",
                                                value: ondcConfig.bppTermsList.delay_interest
                                            },
                                            {
                                                code: "tax_number",
                                                value: process.env.SELLER_GST_NUMBER || DEFAULT_TAX_NUMBER
                                            },
                                            {
                                                code: "provider_tax_number",
                                                value: process.env.PROVIDER_PAN || DEFAULT_PROVIDER_TAX_NUMBER
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            };

            // Map opencart categories and items *directly* into the provider
            categoriesInfo.forEach((category) => {
                ondcCatalog.message.catalog["bpp/providers"][0].categories.push({
                    id: category.category_id,
                    parent_category_id: category.parent_id || "",
                    descriptor: {
                        name: category.name,
                        short_desc: category.description || category.name,
                        long_desc: category.description || category.name,
                        images: [category.image || ondcConfig.bppDescriptor.images[0]]
                    },
                    tags: [
                        {
                            code: "type",
                            list: [
                                {
                                    code: "type",
                                    value: ondcConfig.categoryTags.type
                                }
                            ]
                        },
                        {
                            code: "timing",
                            list: [
                                {
                                    code: "day_from",
                                    value: ondcConfig.categoryTags.timing.day_from
                                },
                                {
                                    code: "day_to",
                                    value: ondcConfig.categoryTags.timing.day_to
                                },
                                {
                                    code: "time_from",
                                    value: ondcConfig.categoryTags.timing.time_from
                                },
                                {
                                    code: "time_to",
                                    value: ondcConfig.categoryTags.timing.time_to
                                }
                            ]
                        },
                        {
                            code: "display",
                            list: [
                                {
                                    code: "rank",
                                    value: category.sort_order || "1"
                                }
                            ]
                        }
                    ]
                });
            });

            // opencartProducts.forEach((product) => {
            for (const product of opencartProducts) {

                // const cleanedDescription = cleanDescription(product.description);
                
                const rawCategory = product.category_name ? he.decode(product.category_name).trim() : null;


                const { ondcCategory, mappedCategoryId } = mapProductToOndcCategory(product);
                // const ondcCategoryName = openCartToOndcCategoryMap[rawCategory];
               
                const rawModel = he.decode(product.name || "").trim(); 
                const parent_item_id = ondcItemVariantMap[rawModel];
                if (!parent_item_id) {
                    console.warn(`No ONDC variant mapping for model "${rawModel}"`);
                  }

                const ondcVariantId = getVariantIdForProduct(product);

                if (!ondcVariantId) {
                    console.warn(`No ONDC variant mapping for model "${rawModel}", falling back to null`);
                }
                const ocCatId = product.categories?.[0]?.id;  
                const ondcCatId = openCartToOndcCategoryMap[ocCatId];
                if (!ondcCatId) {
                    console.warn(`No ONDC category mapping found for "${ocCatId}"`);
                }
                if (process.env.DEBUG === 'true') {
                    console.log(`Product: ${product.name}`);
                    console.log(`Category: ${rawCategory} (${categoryId}) → ${ondcCategory} (${mappedCategoryId})`);
                    console.log(`Variant: ${ondcVariantId}`);
                  }
                
                //   const cleanedText = extractTextFromHTML(product.description);
                const fullDescription = await  getProductDescriptionFromDB(product.product_id);
                const cleanedDescription = extractTextFromHTML(fullDescription);
                const cleanedText = extractTextFromHTML(fullDescription);

                const attributes = categoryAttributes[ondcCategory] || [];
                const attributesFromDesc = parseAttributesFromDescription(cleanedText, ondcCategory);
                const meta = await getProductMetadataFromDB(product.product_id);
                const brand = meta.manufacturer || "";
                const fallbackWeight = meta.weight || "";

                const extraValues = {
                brand,
                weight: attributesFromDesc.weight || fallbackWeight
                };
                  

                const usedKeys = attributes.map(attr => attr.code.toLowerCase());
                const rawFeatures = extractExtraFeatures(fullDescription, usedKeys);

                const attributeList = attributes.map(attr => {
                    const normalizedCode = normalize(attr.code);
                    const matchedValue =
                      attributesFromDesc[normalizedCode] || extraValues[normalizedCode] || product[normalizedCode] || "";
                    return {
                      code: attr.code,
                      value: matchedValue
                    };
                  });
                  const attributeMap = parseAttributesFromDescription(cleanedDescription, ondcCategory); 
                    const productMap = { ...product };
                    

                    const tagList = ALL_ATTRIBUTES.map(attr => {
                    const code = attr.replace(/\*/g, "").trim();
                    const key = normalize(code);

                    const value = attributeMap[key] || extraValues[key] || productMap[key] || "";                    
                    return { code, value };
                    });


                const item = {
                    id: product.product_id,
                    parent_item_id: ondcVariantId,
                    time: {
                        label: "enable",
                        timestamp: product.date_modified
                    },
                    descriptor: {
                        name: product.name,
                        code: product.model || `5:${product.product_id}`,
                        symbol: product.image,
                        short_desc: product.meta_description || product.name,
                        long_desc: cleanedDescription,
                        images: [product.image]
                    },
                    quantity: {
                        unitized: {
                            measure: {
                                unit: ondcConfig.itemDefaults.quantity.unit,
                                value: ondcConfig.itemDefaults.quantity.value
                            }
                        },
                        available: {
                            count: product.quantity
                        },
                        maximum: {
                            count: product.maximum || ondcConfig.itemDefaults.quantity.maximum
                        }
                    },
                    price: {
                        currency: "INR",
                        value: product.price,
                        maximum_value: product.special || product.price,
                        tags: [
                            {
                                code: "range",
                                list: [
                                    {
                                        code: "lower",
                                        value: product.price.toString()
                                    },
                                    {
                                        code: "upper",
                                        value: (product.special || product.price).toString()
                                    }
                                ]
                            }
                        ]
                    },
                    // category_id: product.category_id || "dummy_category",
                    category_id: mappedCategoryId,
                    fulfillment_id: "F1",
                    location_id: ondcConfig.location.id,
                    "@ondc/org/returnable": product.returnable || ondcConfig.itemDefaults.returnable,
                    "@ondc/org/cancellable": ondcConfig.itemDefaults.cancellable,
                    "@ondc/org/seller_pickup_return": ondcConfig.itemDefaults.seller_pickup_return,
                    "@ondc/org/time_to_ship": ondcConfig.itemDefaults.time_to_ship,
                    "@ondc/org/available_on_cod": product.cod_available || ondcConfig.itemDefaults.available_on_cod,
                    "@ondc/org/return_window": product.return_window || ondcConfig.itemDefaults.return_window,
                    "@ondc/org/contact_details_consumer_care": storeInfo.telephone || DEFAULT_CONTACT,
                    tags: [
                        {
                            code: "origin",
                            list: [
                                {
                                    code: "country",
                                    value: product.origin_country || ondcConfig.originDefaults.country
                                }
                            ]
                        },
                       
                        {
                        code: "attribute",
                        list: attributeList
                        },   
                          
                        // {
                        //     code: "description",
                        //     value: tagList
                        //   }                       
                    ]
                };
                ondcCatalog.message.catalog["bpp/providers"][0].items.push(item);
            }
        // );
        
            const callbackUrl = req.body.context.bap_uri + "/on_search";
            console.log('callback url', callbackUrl);
            console.log("responsee:- ", ondcCatalog);

            try {
                const callbackResponse = await axios.post(callbackUrl, ondcCatalog, {
                    headers: { 'Content-Type': 'application/json', "x-dev-mode": "true" }
                });
                console.log("Successfully sent /on_search callback:", callbackResponse.status);
                console.log("/on_search callback message:", callbackResponse.data.message);
            } catch (error) {
                console.error("Error sending /on_search callback:", error.message, error.response?.data);
                return res.json({
                    context: payload.context,
                    error: {
                        type: "DOMAIN-ERROR",
                        code: "40001",
                        message: "Failed to send callback to BAP"
                    }
                });
            }
        
            return;
        } catch (error) {
            console.error("Error processing OpenCart data:", error);
            // Check if it's a connection error
            if (error.code === 'ECONNREFUSED') {
                // Send NACK immediately for connection errors
                return res.json({
                    context: payload.context,
                    error: {
                        type: "DOMAIN-ERROR",
                        code: "40001",
                        message: "OpenCart service unavailable"
                    }
                });
            }
            // For other OpenCart API errors
            return res.json({
                context: payload.context,
                error: {
                    type: "DOMAIN-ERROR",
                    code: "40001",
                    message: "Failed to fetch data from OpenCart"
                }
            });
        }
    } catch (error) {
        console.error("Error in onSearch handler:", error);
        // Return NACK for general errors
        return res.json({
            context: req.body.context,
            error: {
                type: "DOMAIN-ERROR",
                code: "40001",
                message: "Internal server error"
            }
        });
    }
};
