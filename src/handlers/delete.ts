import { Context } from "telegraf";
import { BotState } from "../state";

export const deleteHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const reply1 = "Удачи";

  const welcome_msg = reply1;

  if (user.username) {
    const userEntry = botState.findUserByTelegramId(user.id);
    if (userEntry) {
      const result = await botState.deleteUserReq(userEntry.id);

      await botState.deleteUser(userEntry.id);

      switch (result.type) {
        case "ok":
          await botState.deleteUser(userEntry.id);
          await ctx.reply(welcome_msg);
          break;

        case "already_exists":
          await ctx.reply(welcome_msg, {
            parse_mode: "MarkdownV2",
          });

          break;

        case "error":
          await ctx.reply("Упс, произошла ошибка. Попробуйте позже.");
          break;
      }
    }
  }
};
