import axios from "axios";

export default async function onSelectHandler(req, res) {
    console.log("onSelect handler executed");
    try {
      const payload = req.body;
      const { items, provider, fulfillments } = payload.message.order;
  
      const providerId = provider.id;
      const fulfillmentId = `fulfillment-${providerId}`;
  
      let productDetails = [];
      let unavailableItems = [];
  
      for (const item of items) {
        const productId = item.id;
        const opencartApiUrl = `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/productInfo&json&product_id=${productId}`;
  
        const response = await axios.get(opencartApiUrl);
        const productData = response.data;
  
        console.log("\n\nProduct data:", productData);
  
        if (!productData || !productData.product_id) {
          return res
            .status(404)
            .json({ error: `Product not found for ID: ${productId}` });
        }
  
        // Check stock availability
        if (parseInt(productData.quantity) === 0) {
          unavailableItems.push({
            item_id: productId,
            error: "40002",
          });
        } else {
          productDetails.push({
            fulfillment_id: fulfillmentId,
            id: productId,
            title: productData.name,
            price: {
              currency: "INR",
              value: productData.special || productData.price,
            },
            "@ondc/org/item_quantity": {
              count: item.quantity.count,
            },
          });
        }
      }
  
      // Construct the response object
      const ondcResponse = {
        context: {
          domain: payload.context.domain,
          action: "on_select",
          core_version: payload.context.core_version,
          bap_id: payload.context.bap_id,
          bap_uri: payload.context.bap_uri,
          transaction_id: payload.context.transaction_id,
          message_id: payload.context.message_id,
          city: payload.context.city,
          country: payload.context.country,
          timestamp: new Date().toISOString(),
        },
        message: {
          order: {
            provider: {
              id: providerId,
              locations: provider.locations,
            },
            items: productDetails,
            fulfillments: [
              {
                id: fulfillmentId,
                type: "Delivery",
                "@ondc/org/provider_name": "OpenCart Store",
                tracking: false,
                "@ondc/org/category": "Standard Delivery",
                "@ondc/org/TAT": "PT6H",
                state: {
                  descriptor: {
                    code: "Serviceable",
                  },
                },
              },
            ],
            quote: {
              price: {
                currency: "INR",
                value: productDetails
                  .reduce(
                    (total, item) =>
                      total +
                      parseFloat(item.price.value) *
                        item["@ondc/org/item_quantity"].count,
                    0
                  )
                  .toFixed(2),
              },
              breakup: productDetails.map((item) => ({
                "@ondc/org/item_id": item.id,
                "@ondc/org/item_quantity": item["@ondc/org/item_quantity"],
                title: item.title,
                "@ondc/org/title_type": "item",
                price: item.price,
              })),
            },
          },
        },
      };
  
      // If there are unavailable items, add the error response
      if (unavailableItems.length > 0) {
        ondcResponse.error = {
          type: "DOMAIN-ERROR",
          code: "40002",
          message: JSON.stringify(unavailableItems),
        };
      }
  
      // res.json(ondcResponse);
      const callbackUrl = req.body.context.bap_uri + "/on_select";
        console.log('callback url', callbackUrl);

        try {
            const callbackResponse = await axios.post(callbackUrl, ondcResponse, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            // log the callback response status
        } catch (error) {
            console.error("Error sending /on_select callback:", error.message, error.response?.data);
            // Handle errors during the callback (e.g., logging, retries)
        }
    
        
        return; // Indicate that the handler has completed its asynchronous task
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    }
};