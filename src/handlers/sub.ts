import { Context } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";
import { buildSubKeyboard } from "../keyboards";
import { BotState } from "../state";

export const subHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const userEntry = botState.findUserByTelegramId(user.id);

  if (!userEntry || userEntry.is_deleted) {
    return ctx.reply("Для начала /start");
  }

  const keyboard: InlineKeyboardMarkup = await buildSubKeyboard();

  return ctx.reply("Выбери Тип подписки:", {
    reply_markup: keyboard,
  });
};
