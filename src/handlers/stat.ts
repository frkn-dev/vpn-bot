import { Context } from "telegraf";
import { BotState } from "../state";
import { UserStat } from "../types/stat";

export const statHandler = async (ctx: Context, botState: BotState) => {
	const user = ctx.from;

	if (!user) {
		return ctx.reply("/start для начала");
	}

	const userEntry = await botState.findUserByTelegramId(user.id);

	if (!userEntry || userEntry.is_deleted) {
		return ctx.reply("Для начала /start");
	}

	const stat = await botState.getUserStat(userEntry.id);

	if (stat) {
		const msg = formatTrafficStats(stat);

		return ctx.reply(msg);
	}
};

function formatTrafficStats(stats: UserStat[]): string {
	const parts = stats.map((s) => {
		const lines = [`🔹 ${s.type}`, `  id: ${s.id}`];

		if (s.trial) {
			lines.push(`  limit: ${s.limit} MB`);
		}

		lines.push(
			``,
			`  Status: ${s.status}`,
			``,
			`  • ↑ Upload:   ${Math.round(s.stat.uplink / (1024 * 1024))} MB`,
			`  • ↓ Download: ${Math.round(s.stat.downlink / (1024 * 1024))} MB`,
			`  • Devices Online: ${s.stat.online}`,
		);
		return lines.join("\n");
	});

	const totalUpload = Math.round(
		stats.reduce((sum, s) => sum + s.stat.uplink, 0) / (1024 * 1024),
	);
	const totalDownload = Math.round(
		stats.reduce((sum, s) => sum + s.stat.downlink, 0) / (1024 * 1024),
	);
	const overallStatus = stats.some((s) => s.status === "Active")
		? "Active"
		: "Expired";
	return [
		`Статистика трафика за сегодня:\n`,
		parts.join("\n\n"),
		`\n🔻 Суммарно:`,
		` Status: ${overallStatus}`,
		``,
		` ↑ Upload:   ${totalUpload} MB`,
		` ↓ Download: ${totalDownload} MB`,
	].join("\n");
}
