import type { Context } from "telegraf";
import type { InlineKeyboardMarkup } from "telegraf/types";
import { buildSubPlainKeyboard } from "../shared/keyboards";
import type { BotState } from "../state";

export const subPlainHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const userEntry = await botState.findUserByTelegramId(user.id);

  if (!userEntry || userEntry.is_deleted) {
    return ctx.reply("Для начала /start");
  }
  console.log("User: ", userEntry);
  const keyboard: InlineKeyboardMarkup = await buildSubPlainKeyboard();

  return ctx.reply(
    "▫️ Подходит для: Streisand, Hiddify, FoxRay и других" +
      " \n\n*Нажмите на кнопку, чтобы получить ссылку*",
    {
      reply_markup: keyboard,
      parse_mode: "MarkdownV2",
    },
  );
};
