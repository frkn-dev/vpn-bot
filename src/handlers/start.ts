import { Context } from "telegraf";
import { BotState } from "../state";

export const startHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const reply1 =
    "Добро пожаловать в *FRKN*\\!\nЭтот бот выдаёт ссылки на подключение к *VPN*\\.\n\n";
  const reply2 =
    "Kлиенты:\n*Android*: Hiddify\n*Windows*: Hiddify, Clash Verge\n";
  const reply3 =
    "*iOS, MacOS*: Clash Verge, Streisand, Foxray, Shadowrocket\n*Linux*: Clash Verge\n";
  const reply4 =
    "Больше [клиентов](https://github.com/XTLS/Xray-core?tab=readme-ov-file#gui-clients)\n";
  const reply5 =
    "\nДоступно в сутки 1024 Мегабайта, команда /stat для просмотра статистики";
  const reply6 = "\n\nПолучить *VPN* /connect или /sub";

  const welcome_msg = reply1 + reply2 + reply3 + reply4 + reply5 + reply6;

  if (user.username) {
    const result = await botState.registerUserReq(user.username, user.id);

    console.log("Result type", result.type);

    switch (result.type) {
      case "ok":
        await botState.addUser(result.id, {
          id: result.id,
          username: user.username,
          telegram_id: user.id,
          is_deleted: false,
        });
        await ctx.reply(welcome_msg);
        break;

      case "already_exists":
        const userEntry = botState.getUserByUsername(user.username);
        console.log("userEntry", user.username, userEntry);
        if (userEntry && userEntry?.is_deleted) {
          const res = await botState.undeleteUserReq(userEntry.id);
          console.log("Res type", res.type);
          if (res.type === "ok") {
            const msg = welcome_msg + "\n\nWelcome back";
            await botState.undeleteUser(userEntry.id);
            await ctx.reply(msg, {
              parse_mode: "MarkdownV2",
            });
          }
        }

        break;

      case "error":
        await ctx.reply("Упс, произошла ошибка. Попробуйте позже.");
        break;
    }
  }
};
