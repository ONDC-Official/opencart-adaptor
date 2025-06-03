import axios from "axios";
import {
  BPP_ID,
  BPP_URI,
  DEFAULT_CANCELLATION_TERMS,
  TRANSACTION_LEVEL_TERMS,
} from "../config/constants.js";

export default async function onInitHandler(req, res) {
    console.log("onInit handler executed");
    try {
        const payload = req.body;
        const { items, provider, fulfillments, quote } = payload.message.order;
    
        const providerId = provider.id;
        const fulfillmentId = `fulfillment-${providerId}`;
    
        let productDetails = [];
        let productDetailsInQuote = [];
        let unavailableItems = [];
        let totalValue = 0;
    
        for (const item of items) {
          console.log('first', item);
          const productId = item.id;
          const opencartApiUrl = `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/productInfo&json&product_id=${productId}`;
    
          const response = await axios.get(opencartApiUrl);
          const productData = response.data;
    
          if (!productData || !productData.product_id) {
            return res
              .status(404)
              .json({ error: `Product not found for ID: ${productId}` });
          }
    
          if (parseInt(productData.quantity) === 0) {
            unavailableItems.push({
              item_id: productId,
              error: "40002",
            });
          } else {
            const itemPrice = parseFloat(productData.special || productData.price);
            const itemTotalPrice = itemPrice * item.quantity.count;
            totalValue += itemTotalPrice;
    
            productDetails.push({
              fulfillment_id: fulfillmentId,
              id: productId,
              quantity: {
                count: item.quantity.count,
              },
            });
    
            productDetailsInQuote.push({
              "@ondc/org/item_id": productId,
              "@ondc/org/item_quantity": {
                count: item.quantity.count,
              },
              title: productData.name,
              "@ondc/org/title_type": "item",
              price: {
                currency: "INR",
                value: item.quantity.count * itemPrice.toFixed(2),
              },
              item: {
                price: {
                  currency: "INR",
                  value: itemPrice.toFixed(2),
                },
              },
            });
          }
        }
    
        const ondcResponse = {
          context: {
            ...payload.context,
            action: "on_init",
            bpp_id: BPP_ID,
            bpp_uri: BPP_URI,
            timestamp: new Date().toISOString(),
          },
          message: {
            order: {
              provider: {
                id: providerId,
                locations: provider.locations,
              },
              items: productDetails,
              billing: payload.message.order.billing,
              fulfillments: fulfillments.map((f) => ({
                id: f.id,
                type: f.type,
                "@ondc/org/provider_name": "OpenCart Store",
                tracking: false,
                "@ondc/org/category": "Standard Delivery",
                "@ondc/org/TAT": "PT6H",
                state: {
                  descriptor: {
                    code: "Serviceable",
                  },
                },
              })),
              quote: {
                price: {
                  currency: "INR",
                  value: totalValue.toFixed(2),
                },
                breakup: productDetailsInQuote,
              },
              payment: {
                uri: "https://ondc-payment-gateway.com/pay",
                tl_method: "http/get",
                collected_by: "BPP",
                params: {
                  amount: totalValue.toFixed(2),
                  currency: "INR",
                },
                type: "ON-ORDER",
                status: "NOT-PAID",
              },
              cancellation_terms: DEFAULT_CANCELLATION_TERMS,

              tags: TRANSACTION_LEVEL_TERMS,
            },
          },
        };
    
        if (unavailableItems.length > 0) {
          ondcResponse.error = {
            type: "DOMAIN-ERROR",
            code: "40002",
            message: JSON.stringify(unavailableItems),
          };
        }
    
        // res.json(ondcResponse);
        const callbackUrl = req.body.context.bap_uri + "/on_init";
        console.log('callback url', callbackUrl);
        console.log('resonse:- ',ondcResponse);

        try {
            const callbackResponse = await axios.post(callbackUrl, ondcResponse, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log("Successfully sent /on_init callback:", callbackResponse.status);
            console.log("/on_init callback message:", callbackResponse.data);
            // log the callback response status
        } catch (error) {
            console.error("Error sending /on_init callback:", error.message, error.response?.data);
            // Handle errors during the callback (e.g., logging, retries)
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred while processing the request" });
      }

};