import axios from "axios";

export default async function on_IncrementalSearchHandler(req, res) {
    console.log("incremental Search handler executed");
    try {
        const { context, message } = req.body;
        // console.log('Received Payload:', message.intent.tags);
    
        if (!message || !message.intent || !Array.isArray(message.intent.tags)) {
          return res
            .status(400)
            .json({ error: "Invalid payload structure: 'tags' array missing" });
        }
    
        const catalogIncTag = message.intent.tags.find(
          (tag) => tag.code === "catalog_inc"
        );
    
        if (!catalogIncTag || !Array.isArray(catalogIncTag.list)) {
          return res.status(400).json({
            error: "'catalog_inc' tag is missing or incorrectly formatted",
          });
        }
    
        const startTimeTag = catalogIncTag.list.find(
          (item) => item.code === "start_time"
        );
        const endTimeTag = catalogIncTag.list.find(
          (item) => item.code === "end_time"
        );
    
        const startTime = startTimeTag ? startTimeTag.value : null;
        // console.log('start time', startTime)
        const endTime = endTimeTag ? endTimeTag.value : null;
        // console.log('endTime time', endTime)
    
        if (!startTime || !endTime) {
          return res.status(400).json({
            error: "'start_time' and 'end_time' are required and must be valid",
          });
        }
    
        const opencartResponse = await axios.get(
          // `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/modified&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`
          `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/modified&start_time=${startTime}&end_time=${endTime}&json`
        );
        // console.log('opencartResponse.data',opencartResponse.data)
    
        if (!Array.isArray(opencartResponse.data.shop_products)) {
          return res
            .status(500)
            .json({ error: "Invalid response from OpenCart API" });
        }
    
        const products = opencartResponse.data.shop_products;
    
        const ondcItems = products.map((product) => ({
          id: product.product_id,
          descriptor: {
            name: product.name,
            long_desc: product.description || "",
            images: product.image
              ? [{ url: `${process.env.OPENCART_SITE}/image/${product.image}` }]
              : [],
          },
          price: {
            currency: "INR",
            value: product.price.toString(),
          },
        }));
    
        const ondcResponse = {
          context: {
            ...context,
            action: "on_search",
            bpp_id: context?.bpp_id,
            bpp_uri: context?.bpp_uri,
            timestamp: new Date().toISOString(),
            message_id: crypto.randomUUID(),
          },
          message: {
            catalog: {
              items: ondcItems,
            },
          },
        };
    
        // res.json(ondcResponse);
        const callbackUrl = req.body.context.bap_uri + "/on-incremental-catalog-refresh";
        console.log('callback url', callbackUrl);

        try {
            const callbackResponse = await axios.post(callbackUrl, ondcResponse, {
                headers: { 'Content-Type': 'application/json', "x-dev-mode": "true" }
            });
            console.log("Successfully sent /on-incremental-catalog-refresh callback:", callbackResponse.status);
            console.log("/on-incremental-catalog-refresh callback message:", callbackResponse.data.message);
            // log the callback response status
        } catch (error) {
            console.error("Error sending /on-incremental-catalog-refresh callback:", error.message, error.response?.data);
            // Handle errors during the callback (e.g., logging, retries)
        }
      } catch (error) {
        console.error(
          "Error processing incremental catalog refresh:",
          error.message
        );
        res
          .status(500)
          .json({ error: "An error occurred while processing the request" });
      }

};