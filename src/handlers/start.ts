import { Context } from "telegraf";
import { BotState } from "../state";
import { generateUsername } from "../utils";

export const startHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user || !ctx.chat) {
    return ctx.reply("/start для начала");
  }

  const welcome_msg = [
    "🚀 *Добро пожаловать в FRKN VPN\\!*",
    "",
    "🔐 Бесплатный \\(пока что\\) и быстрый VPN для вашей безопасности",
    "Ни в коем случае не используйте наш впн для обхода блокировок и поиска экстремистких материалов\\, это закон",
    "",
    "📱 *Рекомендуемые приложения:*",
    "• *Android* \\- Hiddify",
    "• *iPhone/iPad* \\- Streisand, Shadowrocket",
    "• *Windows* \\- Hiddify, Clash Verge",
    "• *MacOS* \\- Clash Verge, Streisand",
    "• *Linux* \\- Clash Verge",
    "",
    "💡 [Полный список клиентов](https://github.com/XTLS/Xray-core?tab=readme-ov-file#gui-clients)",
    "",
    "⚡ *Быстрый старт:*",
    "🔗 /connect \\- Получить VPN\\-ключ",
    "📈 /status \\- Проверить статус серверов/нагрузка",
    "💎 /sub \\- Подписочная ссылка",
    "🆘 /support \\- Помощь и поддержка",
    "💬 /feedback \\- Оставить отзыв",
  ].join("\n");

  const username = user.username ?? generateUsername();
  const result = await botState.registerUser(user.id, username);

  switch (result.type) {
    case "ok":
      await ctx.telegram.sendMessage(ctx.chat.id, welcome_msg, {
        parse_mode: "MarkdownV2",
        ...({ disable_web_page_preview: true } as any),
      });
      break;

    case "already_exists":
      const userEntry = await botState.findUserByTelegramId(user.id);
      if (userEntry?.is_deleted) {
        await botState.undeleteUser(userEntry.id);

        await ctx.telegram.sendMessage(ctx.chat.id, welcome_msg, {
          parse_mode: "MarkdownV2",
          ...({ disable_web_page_preview: true } as any),
        });
      } else {
        await ctx.telegram.sendMessage(ctx.chat.id, welcome_msg, {
          parse_mode: "MarkdownV2",
          ...({ disable_web_page_preview: true } as any),
        });
      }
      break;

    case "error":
      await ctx.reply("Упс, произошла ошибка. Попробуйте позже.");
      break;
  }
};
