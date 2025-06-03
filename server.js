import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from 'morgan';
import apiHandler from "./handlers/apihandler.js";  
import onselectRoutes from "./routes/on_select.js";
import oninitRoutes from "./routes/on_init.js";
import onsearchRoutes from "./routes/on_search.js";
import searchRoutes from "./routes/search.js";
import selectRoutes from "./routes/select.js";
import initRoutes from "./routes/init.js";
import issueRoutes from "./routes/issue.js";
import issueStatusRoutes from "./routes/issue_status.js";
import onIssueRoutes from "./routes/on_issue.js";
import onIssueStatusRoutes from "./routes/on_issue_status.js";
import onIncrementalSearchRoutes from "./routes/on_incremental_search.js";
import incrementalSearchRoutes from "./routes/incremental_search.js";
import trackRoutes from "./routes/track.js";
import onTrackRoutes from "./routes/on_track.js";
import confirmRouter from './routes/confirm.js';
import onConfirmRouter from './routes/on_confirm.js';
import { OrderStatus } from './constants.js';
import onUpdateRouter from './routes/on_update.js';
import onCancelRouter from './routes/on_cancel.js';
import updateRouter from "./routes/update.js";
import cancelrouter from "./routes/cancel.js";
import statusRouter from "./routes/status.js";
import onStatusRouter from "./routes/onStatusRoute.js";
import loginRouter from "./routes/login.js";
import { signRequest } from "./auth/cryptoUtils.js"; 
import { globalLimiter, authLimiter, apiLimiter } from './middlewares/rateLimiter.js';
import orderRouter from "./routes/orderRoute.js";


dotenv.config();

const app = express();

// Basic middleware setup
app.use(cors());

// Add raw body capture middleware
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    try {
      // Store raw body for signature verification
      req.rawBodyBuffer = Buffer.from(data);
      
      // Only try to parse JSON if there's actual data
      if (data.trim()) {
        req.body = JSON.parse(data);
      } else {
        req.body = {}; // Set empty object for empty requests
      }
      next();
    } catch (err) {
      console.error('JSON Parse Error:', {
        error: err.message,
        data: data.substring(0, 1000), // Show first 1000 chars of the data
        position: err.message.match(/position (\d+)/)?.[1] || 'unknown'
      });
      next(err);
    }
  });
});
// global rate limiter to all routes
app.use(globalLimiter);

// stricter rate limiter to auth routes
app.use('/auth/*', authLimiter);

// API rate limiter to ONDC API routes
app.use('/api/v1/*', apiLimiter);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}, Duration: ${duration}ms`);
  });
  next();
});

// Health check endpoints
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.get("/bap/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// Apply API handler middleware to all routes except test routes
app.use((req, res, next) => {
  // Skip API validation for test routes and OpenCart routes
  if (req.path.startsWith('/api/test-') || req.path.startsWith('/api/opencart/')) {
    return next();
  }
  apiHandler(req, res, next);
});

// Mount all routes
app.use("/api", onselectRoutes);
app.use("/api", oninitRoutes);
app.use("/api", onsearchRoutes);
app.use("/api", searchRoutes);
app.use("/api", selectRoutes);
app.use("/api", initRoutes);
app.use("/api", issueRoutes);
app.use("/api", onIssueRoutes);
app.use("/api", issueStatusRoutes);
app.use("/api", onIssueStatusRoutes);
app.use("/api", onIncrementalSearchRoutes);
app.use("/api", incrementalSearchRoutes);
app.use("/api", trackRoutes);
app.use("/api", onTrackRoutes);
app.use("/api", updateRouter);
app.use("/api", cancelrouter);
app.use("/api", confirmRouter);
app.use("/api", onConfirmRouter);
app.use("/api", onUpdateRouter);
app.use("/api", onCancelRouter);
app.use("/api", statusRouter);
app.use("/api", onStatusRouter);
app.use("/api", loginRouter);
app.use("/api", orderRouter);


// Test endpoints
app.post("/test/add-order", (req, res) => {
  const { orderId, context, orderDetails } = req.body;
  if (!orderId || !context || !orderDetails) {
    return res.status(400).json({
      message: { ack: { status: "NACK" } },
      error: {
        type: "JSON-SCHEMA-ERROR",
        code: "40001",
        message: "Missing required fields: orderId, context, or orderDetails"
      }
    });
  }
  addBapOrder(orderId, context, orderDetails);
  res.status(200).json({ message: `Order ${orderId} stored in BAP memory` });
});

app.post("/test/reset-order", (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }
  if (!bapOrders[orderId]) {
    return res.status(404).json({ error: `Order ID ${orderId} not found` });
  }
  resetBapOrder(orderId);
  res.status(200).json({ message: `Order ${orderId} reset from memory` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(err.status || 500).json({
    message: { ack: { status: "NACK" } },
    error: {
      type: "CORE-ERROR",
      code: "50000",
      message: err.message || "An unexpected internal server error occurred."
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
