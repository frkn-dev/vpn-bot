import type { Context } from "telegraf";
import type { BotState } from "../state";

export const deleteHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;

  if (!user) {
    return ctx.reply("/start для начала");
  }

  const reply1 = "Удачи";

  if (user.username) {
    const userEntry = await botState.findUserByTelegramId(user.id);

    if (userEntry) {
      const connections = await botState.getUserConnections(userEntry.id);

      for (const conn of connections) {
        const status = await botState.deleteConnection(conn.id);
        if (status) {
          console.log("Connection deleted: ", conn.id);
        } else {
          console.log("Connection Not Deleted: ", conn.id);
        }
      }

      await botState.deleteUser(userEntry.id);
      console.log("User marked as deleted: ", userEntry.id);

      await ctx.reply(reply1);
    }
  }
};
