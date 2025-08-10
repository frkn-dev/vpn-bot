import QRCode from "qrcode";
import { Context } from "telegraf";
import { BotState } from "../../state";

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

	const [_, linkFormat] = data.split("_");

	const user = ctx.from;
	if (!user || !user.username) {
		return ctx.answerCbQuery("Не удалось определить пользователя.");
	}

	const userEntry = await botState.findUserByTelegramId(user.id);
	if (!userEntry || userEntry.is_deleted) {
		return ctx.answerCbQuery("Для начала используйте /start");
	}

	const subLink = botState.getSubLink(userEntry.id, linkFormat);

	const qrBuffer = await QRCode.toBuffer(subLink, {
		errorCorrectionLevel: "H",
		type: "png",
		margin: 8,
		scale: 6,
	});

	await ctx.editMessageText(
		`Ваша Subscription ссылка:\\(${linkFormat}\\)\n\`\`\`\n${subLink}\n\`\`\``,
		{ parse_mode: "MarkdownV2" },
	);

	await ctx.replyWithPhoto(
		{ source: qrBuffer },
		{ caption: `QR-код для ${linkFormat} подписки 🧷` },
	);
}
