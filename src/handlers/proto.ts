import { Context } from 'telegraf';
import { InlineKeyboardMarkup } from 'telegraf/types';
import { BotState } from '../state';
import { NodeStatus, ProtoTag } from '../types/node';



export const protoHandler = async (ctx: Context, botState: BotState) => {
	const env = botState.getEnv();
	const user = ctx.from;

	if (!user?.username) {
		return ctx.reply('Не удалось определить пользователя. Используйте /start.');
	}

	console.log(user);

	const userEntry = botState.findUserByTelegramId(user.id);

	console.log(userEntry);

	if (!userEntry || userEntry.is_deleted) {
		return ctx.reply('Для начала /start');
	}

	const keyboard: InlineKeyboardMarkup = await botState.buildProtoKeyboard();

	return ctx.reply('Выбери VPN протокол:', {
		reply_markup: keyboard,
	});
};
