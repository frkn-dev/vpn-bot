import { bot } from "./bot";
import { app } from "./server";
import { DOMAIN, PORT, WEBHOOK_PATH } from "./shared/config";

// #region Environment variables
const missingVars = [
  "BOT_TOKEN",
  "API_BASE_URL",
  "API_AUTH_TOKEN",
  "DOMAIN",
].filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
}
// #endregion

app.use(bot.webhookCallback(WEBHOOK_PATH));
app
  .listen(PORT, async () => {
    console.log(`[SERVER] Listening on port ${PORT}`);

    try {
      await bot.telegram.setWebhook(`${DOMAIN}${WEBHOOK_PATH}`);
      console.log(`[WEBHOOK] Set webhook: ${DOMAIN}${WEBHOOK_PATH}`);
    } catch (err) {
      console.error("[WEBHOOK] Error setting webhook:", err);
      process.exit(1);
    }
  })
  .on("error", (err) => {
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

// #region Graceful shutdown handlers
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
// #endregion
