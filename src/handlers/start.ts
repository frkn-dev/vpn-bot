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
  const result = await botState.registerUserReq(user.id, username);

  switch (result.type) {
    case "ok":
      await botState.addUser(result.id, {
        id: result.id,
        username: username,
        telegram_id: user.id,
        is_deleted: false,
      });

      await ctx.telegram.sendMessage(ctx.chat.id, welcome_msg, {
        parse_mode: "MarkdownV2",
        ...({ disable_web_page_preview: true } as any),
      });
      break;

    case "already_exists":
      const userEntry = botState.findUserByTelegramId(user.id);
      if (userEntry?.is_deleted) {
        const res = await botState.undeleteUserReq(userEntry.id);
        if (res.type === "ok") {
          await botState.undeleteUser(userEntry.id);
          await ctx.reply(welcome_msg + "\n\nWelcome back", {
            parse_mode: "MarkdownV2",
          });
        }
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
