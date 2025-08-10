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
    const userEntry = await botState.findUserByTelegramId(user.id);
    if (userEntry) {
      await botState.deleteUser(userEntry.id);
    }
  }
};
