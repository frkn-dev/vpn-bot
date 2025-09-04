import { Context } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";
import { buildSubPlainKeyboard } from "../keyboards";
import { BotState } from "../state";

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
    "▫️ Подходит для: v2rayN \\(Windows\\), Shadowrocket, Streisand, FoxRay \\(iOS, MacOS\\), Nekoray, Hiddify и других" +
      " \n\n*Нажмите на кнопку, чтобы получить ссылку*",
    {
      reply_markup: keyboard,
      parse_mode: "MarkdownV2",
    },
  );
};
