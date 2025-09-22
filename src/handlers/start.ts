import type { Context } from "telegraf";
import { generateUsername } from "../shared/generate";
import type { BotState } from "../state";

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

    "🔗 /connect         \— Ссылка на VPN",
    "💎 /clash              \ — Clash ссылка",
    "🌐 /site               \— Если оплачивали подписку на сайте",
    "💚 /status             \—  Cтатус серверов",
    "📊 /stat                \ — Статистика использования",
    "💙 /support          \— Помощь и поддержка",
    "✨ /feedback        \— Оставить отзыв",
  ].join("\n");

  const username = user.username ?? generateUsername();
  const result = await botState.registerUser(user.id, username);

  switch (result.type) {
    // biome-ignore lint/suspicious/noFallthroughSwitchClause: TODO
    case "ok": {
      const userEntry = await botState.findUserByTelegramId(user.id);
      if (userEntry) {
        const conn = await botState.createConnection({
          env: botState.getEnv(),
          proto: "VlessXtls",
          user_id: userEntry.id,
        });

        if (conn) {
          console.log(
            `Created connection ${conn.response} for user ${userEntry.id}`,
          );
        }

        await ctx.telegram.sendMessage(ctx.chat.id, welcome_msg, {
          parse_mode: "MarkdownV2",
          ...({ disable_web_page_preview: true } as any),
        });
        break;
      }
    }

    case "already_exists": {
      const userEntry = await botState.findUserByTelegramId(user.id);
      if (userEntry?.is_deleted) {
        await botState.undeleteUser(userEntry.id);

        const conn = await botState.createConnection({
          env: botState.getEnv(),
          proto: "VlessXtls",
          user_id: userEntry.id,
        });

        if (conn) {
          console.log(
            `ReCreated connection ${conn.response} for user ${userEntry.id}`,
          );
        }
        const welcome_back_msg = welcome_msg + "\nДобро пожаловать снова!";

        await ctx.telegram.sendMessage(ctx.chat.id, welcome_back_msg, {
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
    }
    case "error":
      await ctx.reply("Упс, произошла ошибка. Попробуйте позже.");
      break;
  }
};
