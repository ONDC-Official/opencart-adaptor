import express from "express";
 import trackHandler from "../handlers/Track.js";
 import trackMiddleware from "../middlewares/TrackMiddleware.js";
 
 const router = express.Router();
 router.post("/track", trackMiddleware, trackHandler);
 
 export default router;

