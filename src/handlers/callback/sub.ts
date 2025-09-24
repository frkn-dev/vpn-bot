import QRCode from "qrcode";
import type { Context } from "telegraf";
import type { BotState } from "../../state";

export async function handleSubscriptionCallback(
  ctx: Context,
  botState: BotState,
) {
  const callbackQuery = ctx.callbackQuery;

  if (!callbackQuery || !("data" in callbackQuery)) {
    return await ctx.answerCbQuery();
  }

  const data = callbackQuery.data;
  if (!data) {
    return await ctx.answerCbQuery();
  }

  const user = ctx.from;
  if (!user || !user.username) {
    return ctx.answerCbQuery("Не удалось определить пользователя.");
  }

  const userEntry = await botState.findUserByTelegramId(user.id);
  if (!userEntry || userEntry.is_deleted) {
    return ctx.answerCbQuery("Для начала используйте /start");
  }

  const subLink = botState.getSubLink(userEntry.id, "plain");

  const qrBuffer = await QRCode.toBuffer(subLink, {
    errorCorrectionLevel: "H",
    type: "png",
    margin: 8,
    scale: 6,
  });

  await ctx.editMessageText(
    `*Нажмите на ссылку, чтобы скопировать* \n\`\`\`\n${subLink}\n\`\`\``,
    { parse_mode: "MarkdownV2" },
  );

  await ctx.replyWithPhoto(
    { source: qrBuffer },
    { caption: `QR-код для VPN подписки 🧷` },
  );
}
