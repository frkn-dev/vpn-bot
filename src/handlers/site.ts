import type { Context } from "telegraf";
import type { BotState } from "../state";

export const awaitingMnemonic: Record<number, boolean> = {};

export const siteHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const userEntry = await botState.findUserByTelegramId(user.id);

  if (!userEntry || userEntry.is_deleted) {
    return ctx.reply("Для начала /start");
  }

  awaitingMnemonic[ctx.from.id] = true;
  return ctx.reply("Введите вашу мнемоническую фразу (12 слов):");
};
