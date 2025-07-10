import * as dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { statHandler } from "./handlers";
import { handleInboundCallback } from "./handlers/callback/inbound";
import { handleProtoCallback } from "./handlers/callback/proto";
import { handleSubscriptionCallback } from "./handlers/callback/sub";
import { connectHandler } from "./handlers/connect";
import { deleteHandler } from "./handlers/delete";
import { startHandler } from "./handlers/start";
import { subHandler } from "./handlers/sub";
import { BotState } from "./state";
import { TelegramError } from "telegraf";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL;

if (!BOT_TOKEN || !API_BASE_URL) {
  throw new Error("BOT_TOKEN or API_BASE_URL are missed in  .env");
}

const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;
if (!API_AUTH_TOKEN) {
  throw new Error("API_AUTH_TOKEN env variable is required");
}

const bot = new Telegraf(BOT_TOKEN);

const botState = new BotState(API_BASE_URL, API_AUTH_TOKEN);

(async () => {
  try {
    const users = await botState.getUsersReq();
    await botState.addUsers(users);
    console.log(`Users loaded: ${users.length}`);
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error loading users:", err);
    process.exit(1);
  }

  bot.command("start", (ctx) => startHandler(ctx, botState));
  bot.command("connect", (ctx) => connectHandler(ctx, botState));
  bot.command("sub", (ctx) => subHandler(ctx, botState));
  bot.command("stat", (ctx) => statHandler(ctx, botState));
  bot.command("delete", (ctx) => deleteHandler(ctx, botState));

  bot.on("text", async (ctx) => {
    const message = ctx.message.text;
    if (message.startsWith("/")) {
      console.log("1");
      await ctx.reply(
        "Неизвестная команда 🫣\nПопробуйте /start, /connect, /sub, /stat или /delete",
      );
    }
  });

  bot.on("callback_query", async (ctx) => {
    try {
      const callbackQuery = ctx.callbackQuery;

      try {
        await ctx.answerCbQuery();
      } catch (err) {
        if (
          err instanceof TelegramError &&
          !err?.description?.includes("query is too old") &&
          !err?.description?.includes("query ID is invalid")
        ) {
          console.error("answerCbQuery error:", err);
        }
      }

      if (!callbackQuery || !("data" in callbackQuery)) return;

      const data = callbackQuery.data;
      if (!data) return;

      if (data.startsWith("proto_")) {
        await handleProtoCallback(ctx, botState);
      } else if (data.startsWith("inbound_")) {
        await handleInboundCallback(ctx, botState);
      } else if (data.startsWith("sub_")) {
        await handleSubscriptionCallback(ctx, botState);
      } else {
        await ctx.reply("Неизвестная команда.");
      }
    } catch (err) {
      console.error("Callback query error:", err);
      try {
        await ctx.answerCbQuery("Произошла ошибка, попробуйте снова");
      } catch (_) {}
    }
  });

  bot.launch();
  console.log("->> Bot started");
})();
