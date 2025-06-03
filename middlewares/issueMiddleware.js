import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

export default async function issueMiddleware(req, res, next) {
  console.log("Middleware triggered for /issue");
  req.processedAt = new Date();

  try {
    const authCookie = req.cookies;
    // console.log("Cookies:", authCookie);
    const token = authCookie?.api_token;

    const isTokenPresent = !!(token);

    if(!isTokenPresent) {
      const loginData = new FormData();
    loginData.append("username", process.env.OPENCART_USERNAME);
    loginData.append("key", process.env.OPENCART_KEY);

    const loginResponse = await axios.post(
      `${process.env.OPENCART_SITE}/index.php?route=api/login`,
      loginData,
    );

    const apiToken = loginResponse.data.api_token;
    console.log("Login success. API Token:", apiToken);

    res.cookie("api_token", apiToken, { httpOnly: true, maxAge: 3600000 });

     // Update the value for checking later
     req.cookies.api_token = apiToken;
    }


    // Extract api_token from cookies
    const apiToken = authCookie?.api_token;

    // Check if .env has necessary credentials
    const hasCredentials =
      process.env.OPENCART_USERNAME && process.env.OPENCART_KEY;

    // Extract order ID from payload
    const orderId = req.body?.message?.issue?.order_details?.id;
    console.log("Extracted orderId:", orderId);

    if (!orderId) {
      console.warn("No Order ID found in request.");
      req.isValidRequest = false;
      return next();
    }

    let isOrderValid = false;
    try {
      const formData = new FormData();
      formData.append("order_id", orderId);
      console.log(formData);

      const response = await axios.post(
        `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/checkOrderId`,
        formData
      );

      const data = response.data;
      console.log("Order ID Check Response:", data);

      if (response.data.success) {
        isOrderValid = true;
        console.log('TRUE')
      } else {
        isOrderValid = false;
      }
    } catch (axiosError) {
      console.error(
        "Error validating orderId with Opencart:",
        axiosError?.response?.data || axiosError.message
      );
    //   isOrderValid = false;
    }

    // Validation logic
    const isValidRequest = !!(apiToken && hasCredentials);

    req.isValidRequest = isValidRequest;
    req.isOrderValid = isOrderValid;

    if (isValidRequest || isOrderValid) {
      console.log("Valid request. Proceeding...");
    } else {
      console.warn(
        "Invalid request. Missing Opencart token or env credentials."
      );
    }

    next();
  } catch (error) {
    console.error("Middleware Error:", error);
    return res.status(500).json({ error: "An error occurred in middleware." });
  }
}
