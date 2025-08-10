import { Context } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";
import { buildSubKeyboard } from "../keyboards";
import { BotState } from "../state";

export const subHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const userEntry = await botState.findUserByTelegramId(user.id);

  if (!userEntry || userEntry.is_deleted) {
    return ctx.reply("Для начала /start");
  }

  console.log("User: ", userEntry);

  const keyboard: InlineKeyboardMarkup = await buildSubKeyboard();

  return ctx.reply(
    "📋 *Выберите тип подписки:*\n\n" +
      "📄 *Plain* \\- Обычная ссылка \\(рекомендуется\\)\n" +
      "▫️ Подходит для: v2rayN \\(Windows\\), Shadowrocket, Streisand, FoxRay \\(iOS, MacOS\\), Nekoray, Hiddify и других\n\n" +
      "⚙️ *Clash* \\- Конфигурационный файл\n" +
      "▫️ Подходит для: Clash Verge, Clash Meta, Stash \\(iOS\\), Hiddify и других\n\n" +
      "💡 Если сомневаетесь \\- выбирайте *Plain*\n\n" +
      "⚠️ *Важно:* чтобы в подписке появились сервера, сначала выберите нужные в разделе /connect \\!\\!\\!" +
      " \n\n Для проверки статуса серверов команда /status ",
    {
      reply_markup: keyboard,
      parse_mode: "MarkdownV2",
    },
  );
};
