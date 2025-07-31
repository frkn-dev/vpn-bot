import * as dotenv from "dotenv";
import express from "express";
import { Telegraf, TelegramError } from "telegraf";
import { statHandler } from "./handlers";
import { handleInboundCallback } from "./handlers/callback/inbound";
import { handleProtoCallback } from "./handlers/callback/proto";
import { handleSubscriptionCallback } from "./handlers/callback/sub";
import { connectHandler } from "./handlers/connect";
import { deleteHandler } from "./handlers/delete";
import {
  feedbackHandler,
  handleFeedbackCallback,
  handleFeedbackMessage,
} from "./handlers/feedback";
import { scoreHandler } from "./handlers/score";
import { startHandler } from "./handlers/start";
import { subHandler } from "./handlers/sub";
import { BotState } from "./state";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "BOT_TOKEN",
  "API_BASE_URL",
  "API_AUTH_TOKEN",
  "DOMAIN",
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
}

const BOT_TOKEN = process.env.BOT_TOKEN!;
const API_BASE_URL = process.env.API_BASE_URL!;
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN!;
const DOMAIN = process.env.DOMAIN!;
const PORT = process.env.PORT || 3000;
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/telegram/webhook";
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "GOOGLE_SCRIPT_URL";
const TOKEN = process.env.FEEDBACK_SECRET_TOKEN || "FEEDBACK_TOKEN";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "ADMIN_CHAT_ID";

const bot = new Telegraf(BOT_TOKEN);
const botState = new BotState(
  API_BASE_URL,
  API_AUTH_TOKEN,
  GOOGLE_SCRIPT_URL,
  TOKEN,
  ADMIN_CHAT_ID,
);

const app = express();

// Middleware setup in correct order
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Webhook logging
app.post(WEBHOOK_PATH, (req, res, next) => {
  console.log(`[WEBHOOK] Received update:`, JSON.stringify(req.body, null, 2));
  next();
});

// Bot webhook handler
app.use(bot.webhookCallback(WEBHOOK_PATH));

// Global bot error handler
bot.catch((err, ctx) => {
  console.error(`[BOT ERROR] User ${ctx.from?.id}:`, err);
  try {
    ctx.reply("Произошла ошибка. Попробуйте позже.");
  } catch (e) {
    console.error("Failed to send error message:", e);
  }
});

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  console.log(`[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
  try {
    await bot.telegram.deleteWebhook();
    console.log("[SHUTDOWN] Webhook deleted successfully");
  } catch (err) {
    console.error("[SHUTDOWN] Error deleting webhook:", err);
  }
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

(async () => {
  try {
    // Load users on startup
    console.log("[STARTUP] Loading users...");
    const users = await botState.getUsersReq();
    await botState.addUsers(users);
    console.log(`[STARTUP] Users loaded: ${users.length}`);

    // Log user details only in development
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Users:", JSON.stringify(users, null, 2));
    }
  } catch (err) {
    console.error("[STARTUP] Error loading users:", err);
    process.exit(1);
  }

  // Command handlers
  bot.command("start", (ctx) => startHandler(ctx, botState));
  bot.command("connect", (ctx) => connectHandler(ctx, botState));
  bot.command("sub", (ctx) => subHandler(ctx, botState));
  bot.command("stat", (ctx) => statHandler(ctx, botState));
  bot.command("delete", (ctx) => deleteHandler(ctx, botState));
  bot.command("status", (ctx) => scoreHandler(ctx, botState));
  bot.command("feedback", (ctx) => feedbackHandler(ctx, botState));
  bot.command("support", (ctx) => feedbackHandler(ctx, botState)); // Alias for feedback

  // Text message handler
  bot.on("text", async (ctx) => {
    const message = ctx.message.text;

    // Handle feedback messages first
    const handledByFeedback = await handleFeedbackMessage(ctx, botState);
    if (handledByFeedback) {
      return;
    }

    // Handle unknown commands
    if (message.startsWith("/")) {
      await ctx.reply(
        "Неизвестная команда 🫣\n\nДоступные команды:\n" +
          "• /start - Начать работу\n" +
          "• /connect - Подключиться к VPN\n" +
          "• /sub - Управление подпиской\n" +
          "• /status - Проверить статус\n" +
          "• /stat - Статистика\n" +
          "• /support - Поддержка и обратная связь\n" +
          "• /delete - Удалить аккаунт",
      );
    }
  });

  // Callback query handler
  bot.on("callback_query", async (ctx) => {
    try {
      const callbackQuery = ctx.callbackQuery;

      // Answer callback query to remove loading state
      try {
        await ctx.answerCbQuery();
      } catch (err) {
        // Ignore common callback query errors
        if (
          err instanceof TelegramError &&
          !err?.description?.includes("query is too old") &&
          !err?.description?.includes("query ID is invalid")
        ) {
          console.error("[CALLBACK] answerCbQuery error:", err);
        }
      }

      if (!callbackQuery || !("data" in callbackQuery)) return;

      const data = callbackQuery.data;
      if (!data) return;

      console.log(`[CALLBACK] User ${ctx.from?.id} pressed: ${data}`);

      // Route callback data to appropriate handlers
      if (data.startsWith("feedback_")) {
        await handleFeedbackCallback(ctx, botState);
      } else if (data.startsWith("proto_")) {
        await handleProtoCallback(ctx, botState);
      } else if (data.startsWith("inbound_")) {
        await handleInboundCallback(ctx, botState);
      } else if (data.startsWith("sub_")) {
        await handleSubscriptionCallback(ctx, botState);
      } else {
        console.log(`[CALLBACK] Unknown callback data: ${data}`);
        await ctx.reply("Неизвестная команда.");
      }
    } catch (err) {
      console.error("[CALLBACK] Callback query error:", err);
      try {
        await ctx.answerCbQuery("Произошла ошибка, попробуйте снова");
      } catch (answerErr) {
        console.error("[CALLBACK] Failed to answer callback query:", answerErr);
      }
    }
  });

  // Start server and set webhook
  const server = app.listen(PORT, async () => {
    console.log(`[SERVER] Listening on port ${PORT}`);

    try {
      await bot.telegram.setWebhook(`${DOMAIN}${WEBHOOK_PATH}`);
      console.log(`[WEBHOOK] Set webhook: ${DOMAIN}${WEBHOOK_PATH}`);
    } catch (err) {
      console.error("[WEBHOOK] Error setting webhook:", err);
      process.exit(1);
    }
  });

  // Handle server errors
  server.on("error", (err) => {
    console.error("[SERVER] Server error:", err);
    process.exit(1);
  });

  console.log(
    `[STARTUP] Bot started successfully\n` +
      `  Domain: ${DOMAIN}\n` +
      `  Port: ${PORT}\n` +
      `  Webhook path: ${WEBHOOK_PATH}\n` +
      `  Environment: ${process.env.NODE_ENV || "development"}`,
  );
})().catch((err) => {
  console.error("[STARTUP] Fatal error during startup:", err);
  process.exit(1);
});
