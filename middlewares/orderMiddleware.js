import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';

dotenv.config();

export default async function orderMiddleware(req, res, next) {
  console.log("Middleware triggered for /order");
  req.processedAt = new Date();

  try {
    const authCookie = req.cookies;
    console.log("Cookies:", authCookie);

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

     // Updating the value for checking later
     req.cookies.api_token = apiToken;
    }

    // Extracting the opencart api_token from cookies
    const apiToken = authCookie?.api_token;
    
    const hasCredentials = process.env.OPENCART_USERNAME && process.env.OPENCART_KEY;

    const isValidRequest = !!(apiToken && hasCredentials);

    req.isValidRequest = isValidRequest;

    if (isValidRequest) {
      console.log('Valid request. Proceeding...');
    } else {
      console.warn('Invalid request. Missing Opencart token or env credentials.');
    }

    next();
    
  } catch (error) {
    console.error("Middleware Error:", error);
    return res.status(500).json({ error: "An error occurred in middleware." });
  }
}
