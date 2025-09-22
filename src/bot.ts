import { Telegraf, TelegramError } from "telegraf";
import {
  awaitingMnemonic,
  siteHandler,
  statHandler,
  subClashHandler,
  subPlainHandler,
} from "./handlers";
import { handleSubscriptionClashCallback } from "./handlers/callback/clash";
import { handleSubscriptionCallback } from "./handlers/callback/sub";
import { deleteHandler } from "./handlers/delete";
import {
  feedbackHandler,
  handleFeedbackCallback,
  handleFeedbackMessage,
} from "./handlers/feedback";
import { scoreHandler } from "./handlers/score";
import { startHandler } from "./handlers/start";
import {
  ADMIN_CHAT_ID,
  API_AUTH_TOKEN,
  API_BASE_URL,
  BOT_TOKEN,
  GOOGLE_SCRIPT_URL,
  TOKEN,
} from "./shared/config";
import { connectWithMnemonic } from "./site";
import { BotState } from "./state";

export const bot = new Telegraf(BOT_TOKEN);
export const botState = new BotState(
  API_BASE_URL,
  API_AUTH_TOKEN,
  GOOGLE_SCRIPT_URL,
  TOKEN,
  ADMIN_CHAT_ID,
);

// Command handlers
bot.command("start", (ctx) => startHandler(ctx, botState));
bot.command("connect", (ctx) => subPlainHandler(ctx, botState));
bot.command("clash", (ctx) => subClashHandler(ctx, botState));
bot.command("stat", (ctx) => statHandler(ctx, botState));
bot.command("site", (ctx) => siteHandler(ctx, botState));
bot.command("delete", (ctx) => deleteHandler(ctx, botState));
bot.command("stop", (ctx) => deleteHandler(ctx, botState));
bot.command("status", (ctx) => scoreHandler(ctx, botState));
bot.command("feedback", (ctx) => feedbackHandler(ctx, botState));
bot.command("support", (ctx) => feedbackHandler(ctx, botState)); // Alias for feedback

// Menu
bot.telegram.setMyCommands([
  { command: "start", description: "Начать работу" },
  { command: "connect", description: "Получить VPN ссылку" },
  { command: "clash", description: "Получить VPN Clash ссылку" },
  { command: "stat", description: "Статистика" },
  { command: "site", description: "Если оплачивали подписку на сайте" },
]);

// Text message handler
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text;

  // Handle feedback messages first
  const handledByFeedback = await handleFeedbackMessage(ctx, botState);
  if (handledByFeedback) {
    return;
  }

  // Handle site command
  if (awaitingMnemonic[userId]) {
    awaitingMnemonic[userId] = false; // reset

    const words = message.trim().split(/\s+/);
    if (words.length !== 12) {
      return ctx.reply(
        "Фраза должна содержать 12 слов. Попробуйте ещё раз командой /site",
      );
    }

    try {
      const data = await connectWithMnemonic(message.trim());
      if (typeof data === "string") {
        await ctx.reply(data);
      } else {
        await ctx.reply(`Ваша ссылка: <code>${data.subscription_url}</code>`, {
          parse_mode: "HTML",
        });
      }
    } catch (err) {
      console.error("Ошибка в siteHandler:", err);
      await ctx.reply("Ошибка при обработке фразы.");
    } finally {
      // biome-ignore lint/correctness/noUnsafeFinally: TODO
      return;
    }
  }

  // Handle unknown commands
  if (message.startsWith("/")) {
    await ctx.reply(
      "Неизвестная команда 🫣\n\nДоступные команды:\n" +
        "• /start - Начать работу\n" +
        "• /connect - Получить VPN ссылку\n" +
        "• /clash - Получить VPN Clash ссылку\n" +
        "• /status - Проверить статус\n" +
        "• /stat - Статистика\n" +
        "• /site - Если оплачивали подписку на сайте\n" +
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
    } else if (data.startsWith("plain")) {
      await handleSubscriptionCallback(ctx, botState);
    } else if (data.startsWith("clash")) {
      await handleSubscriptionClashCallback(ctx, botState);
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

// Global bot error handler
bot.catch(async (err, ctx) => {
  console.error(`[BOT ERROR] User ${ctx.from?.id}:`, err);
  try {
    await ctx.reply("Произошла ошибка. Попробуйте позже.");
  } catch (e) {
    console.error("Failed to send error message:", e);
  }
});
