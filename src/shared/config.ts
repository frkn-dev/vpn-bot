import * as dotenv from "dotenv";

dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const API_BASE_URL = process.env.API_BASE_URL!;
export const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN!;
export const DOMAIN = process.env.DOMAIN!;
export const PORT = process.env.PORT || 3000;
export const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/telegram/webhook";

export const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL || "GOOGLE_SCRIPT_URL";

export const TOKEN = process.env.FEEDBACK_SECRET_TOKEN || "FEEDBACK_TOKEN";
export const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "ADMIN_CHAT_ID";
