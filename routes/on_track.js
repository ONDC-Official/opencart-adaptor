import express from "express";
 import onTrackHandler from "../handlers/onTrack.js";
 import onTrackMiddleware from "../middlewares/onTrackMiddleware.js";
 
 const router = express.Router();
 router.post("/on_track", onTrackMiddleware, onTrackHandler);
 
 export default router;

