import express from "express";
import { WEBHOOK_PATH } from "./shared/config";

export const app = express();
app.use(express.json());

// Logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Webhook logging
app.post(WEBHOOK_PATH, (req, _res, next) => {
  console.log(`[WEBHOOK] Received update:`, JSON.stringify(req.body, null, 2));
  next();
});
