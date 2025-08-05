// handlers/feedback.ts - Secure version for VPN service
import { Context } from "telegraf";
import { BotState } from "../state";

interface FeedbackData {
	token: string;
	username?: string;
	user_id: number;
	message: string;
	rating?: string;
	date: string;
}

// Rate limiting: user_id -> last message time
const userLastMessage = new Map<number, number>();
const userFeedbackState = new Map<
	number,
	{ rating?: string; awaitingMessage: boolean }
>();

export const feedbackHandler = async (ctx: Context, botState: BotState) => {
	const userId = ctx.from?.id;
	if (!userId) return;

	// Check rate limiting (5 minutes between feedback)
	const now = Date.now();
	const lastMessageTime = userLastMessage.get(userId) || 0;
	const fiveMinutes = 5 * 60 * 1000;

	if (now - lastMessageTime < fiveMinutes) {
		const remainingTime = Math.ceil(
			(fiveMinutes - (now - lastMessageTime)) / 60000,
		);
		await ctx.reply(
			`⏱️ Пожалуйста, подождите ${remainingTime} мин. перед отправкой следующего отзыва.`,
		);
		return;
	}

	const keyboard = {
		inline_keyboard: [
			[
				{ text: "⭐", callback_data: "feedback_rate_1" },
				{ text: "⭐⭐", callback_data: "feedback_rate_2" },
				{ text: "⭐⭐⭐", callback_data: "feedback_rate_3" },
			],
			[
				{ text: "⭐⭐⭐⭐", callback_data: "feedback_rate_4" },
				{ text: "⭐⭐⭐⭐⭐", callback_data: "feedback_rate_5" },
			],
		],
	};

	await ctx.reply(
		"📝 Сообщить о проблеме или оставить отзыв о нашем VPN сервисе!\n\nСначала оцените ваш опыт:",
		{ reply_markup: keyboard },
	);
};

export const handleFeedbackCallback = async (
	ctx: Context,
	botState: BotState,
) => {
	const callbackQuery = ctx.callbackQuery;
	if (!callbackQuery || !("data" in callbackQuery)) return;

	const data = callbackQuery.data;
	if (!data?.startsWith("feedback_rate_")) return;

	const rating = data.replace("feedback_rate_", "");
	const userId = ctx.from?.id;

	if (!userId) return;

	// Rating validation
	if (!["1", "2", "3", "4", "5"].includes(rating)) {
		await ctx.answerCbQuery("Неверная оценка");
		return;
	}

	userFeedbackState.set(userId, { rating, awaitingMessage: true });

	const stars = "⭐".repeat(parseInt(rating));
	await ctx.editMessageText(
		`Спасибо за оценку ${stars}!\n\n💬 Теперь опишите вашу проблему или отзыв. Для быстрого решения укажите:\n\n` +
			`  📱 Тип устройства (iPhone, Android, Windows и т.д.)\n` +
			`  🌍 Ваше местоположение/город/провайдер\n` +
			`  📡 Тип соединения (протокол/к какому серверу/стране подключаетесь)\n` +
			`\n ` +
			`  🔧 Если есть — Ваш Id с сайта frkn.org в виде XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX#cluster_nameN\n` +
			`\nСпасибо\nМаксимум 1000 символов:`,
	);
};

export const handleFeedbackMessage = async (
	ctx: Context,
	botState: BotState,
): Promise<boolean> => {
	const userId = ctx.from?.id;
	const message =
		ctx.message && "text" in ctx.message ? ctx.message.text : "";

	if (!userId || !message) return false;

	const userState = userFeedbackState.get(userId);
	if (!userState?.awaitingMessage) return false;

	// Message validation
	if (message.length > 1000) {
		await ctx.reply(
			"❌ Сообщение слишком длинное. Максимум 1000 символов.",
		);
		return true;
	}

	// Filter suspicious content
	const cleanMessage = message
		.replace(/<[^>]*>/g, "[HTML удален]") // Remove HTML
		.replace(/javascript:/gi, "[JS удален]") // Remove JS
		.replace(/script/gi, "[СКРИПТ удален]"); // Remove script

	// Simple spam check
	const spamWords = [
		"казино",
		"нажмите здесь",
		"advertisement",
		"casino",
		"click here",
	];
	const isSpam = spamWords.some((word) =>
		cleanMessage.toLowerCase().includes(word),
	);

	if (isSpam) {
		await ctx.reply("❌ Сообщение содержит запрещенный контент.");
		userFeedbackState.delete(userId);
		return true;
	}

	const feedbackData: FeedbackData = {
		token: botState.getGoogleScriptToken(),
		username:
			ctx.from?.username ||
			`${ctx.from?.first_name} ${ctx.from?.last_name}`.trim(),
		user_id: userId,
		message: cleanMessage,
		rating: userState.rating,
		date: new Date().toISOString(),
	};

	try {
		const response = await fetch(botState.getGoogleScriptUrl(), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(feedbackData),
			// Add timeout
			signal: AbortSignal.timeout(10000), // 10 seconds
		});

		const result = await response.json().catch(() => ({ status: "error" }));

		if (response.ok && result.status === "success") {
			await ctx.reply(
				"✅ Спасибо за ваш отзыв! Мы рассмотрим его и поработаем над улучшениями или свяжемся с вами напрямую.",
			);

			// Update last message time
			userLastMessage.set(userId, Date.now());

			// Send admin notification
			if (botState.getAdminChatId()) {
				const adminMessage =
					`🔔 Новый отзыв/сообщение о проблеме VPN!\n\n` +
					`👤 От: @${feedbackData.username} (ID: ${feedbackData.user_id})\n` +
					`⭐ Оценка: ${feedbackData.rating}/5\n` +
					`💬 Сообщение: ${feedbackData.message}`;

				try {
					await ctx.telegram.sendMessage(
						botState.getAdminChatId(),
						adminMessage,
					);
				} catch (adminError) {
					console.error(
						"Failed to send admin notification:",
						adminError,
					);
				}
			}
		} else if (result.message === "Rate limit exceeded") {
			await ctx.reply("⏱️ Слишком много сообщений. Попробуйте позже.");
		} else {
			throw new Error(`Server responded: ${result.message}`);
		}
	} catch (error) {
		console.error("Error sending feedback:", error);
		if (error instanceof Error && error.name === "TimeoutError") {
			await ctx.reply("⏱️ Превышено время ожидания. Попробуйте позже.");
		} else {
			await ctx.reply(
				"❌ Ошибка сохранения сообщения. Попробуйте позже.",
			);
		}
	}

	userFeedbackState.delete(userId);
	return true;
};
