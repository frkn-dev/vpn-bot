import { Context } from "telegraf";
import { BotState } from "../state";
import { generateUsername } from "../utils";

export const startHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const welcome_msg = [
    "Добро пожаловать в *FRKN*\\!",
    "Этот бот выдаёт ссылки на подключение к *VPN*\\.\n",
    "*Android*: Hiddify",
    "*Windows*: Hiddify, Clash Verge",
    "*iOS, MacOS*: Clash Verge, Streisand, Foxray, Shadowrocket",
    "*Linux*: Clash Verge",
    "Больше [клиентов](https://github.com/XTLS/Xray-core?tab=readme-ov-file#gui-clients)",
    "\nДоступно в сутки 1024 Мегабайта, команда /stat для просмотра статистики",
    "\n\nПолучить *VPN* /connect или /sub",
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
      await ctx.reply(welcome_msg, {
        parse_mode: "MarkdownV2",
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
        await ctx.reply(welcome_msg, {
          parse_mode: "MarkdownV2",
        });
      }
      break;

    case "error":
      await ctx.reply("Упс, произошла ошибка. Попробуйте позже.");
      break;
  }
};
