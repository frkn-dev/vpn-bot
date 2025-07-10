import { Context } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";
import { buildProtoKeyboard } from "../keyboards";
import { BotState } from "../state";

export const connectHandler = async (ctx: Context, botState: BotState) => {
	const user = ctx.from;

	if (!user?.username) {
		return ctx.reply(
			"Не удалось определить пользователя. Используйте /start.",
		);
	}

	console.log(user);
	const userEntry =
		botState.findUserByTelegramId(user.id) ||
		botState.findUserByTelegramUsername(user.username);

	if (!userEntry || userEntry.is_deleted) {
		return ctx.reply("Для начала /start");
	}

	const keyboard: InlineKeyboardMarkup = await buildProtoKeyboard();

	return ctx.reply("Выбери VPN протокол:", {
		reply_markup: keyboard,
	});
};
