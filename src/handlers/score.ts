import type { Context } from "telegraf";
import type { BotState } from "../state";

export const scoreHandler = async (ctx: Context, botState: BotState) => {
  const user = ctx.from;
  if (!user) return ctx.reply("/start для начала");

  const userEntry = await botState.findUserByTelegramId(user.id);
  if (!userEntry || userEntry.is_deleted) return ctx.reply("Для начала /start");

  await ctx.reply("⚙️ Считаю метрики, подожди...");

  try {
    const env = botState.getEnv();
    const nodes = await botState.getNodes(env);
    if (!nodes || nodes.length === 0) {
      return ctx.reply("❌ Нет доступных нод для оценки");
    }

    const scores = await Promise.all(
      nodes.map(async (node) => {
        const score = await botState.getNodeScore(node.uuid);

        return {
          hostname: node.hostname,
          env: node.env,
          label: node.label,
          score: score?.score ?? null,
          details: score?.details ?? null,
          max_band: node.max_bandwidth_bps,
          status: node.status,
        };
      }),
    );

    const header =
      "📊 Статус серверов (чем ниже нагрузка, тем лучше):\n" +
      "🟢 — низкая нагрузка\n" +
      "🟡 — средняя нагрузка\n" +
      "🔴 — высокая нагрузка\n\n";

    const formatted = scores
      .sort((a, b) => {
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return b.score - a.score;
      })
      .map((s) => {
        if (s.status === "Offline") {
          return `🔴 <b>Offline - ${s.label}</b> (${s.env})\n⛔ Нода недоступна\n`;
        }

        if (s.score) {
          const score = s.score;
          const emoji = score < 0.4 ? "🟢" : score < 0.75 ? "🟡" : "🔴";

          const bandwidthCurrentMbps = (
            (s.details?.bandwidth ?? 0) / 1_000_000
          ).toFixed(1);
          const bandwidthMaxMbps = (s.max_band / 1_000_000).toFixed(1);

          return `${emoji} <b>${s.status} - ${s.label}</b> (${s.env}) \nИспользуется: ${bandwidthCurrentMbps}/${bandwidthMaxMbps} Mbps \nНагрузка: ${(score * 100).toFixed(1)} / 100%\n`;
        } else {
          return `🟡 <b>Online - ${s.label}</b> (${s.env})\nСтатистика сервера недоступна\n\n`;
        }
      })
      .join("\n");

    if (!formatted) {
      return ctx.reply("❌ Не удалось получить скор ни для одной ноды");
    }

    return ctx.replyWithHTML(header + formatted);
  } catch (err) {
    console.error("❌ Ошибка при обработке scoreHandler:", err);
    return ctx.reply("❌ Не удалось получить метрики");
  }
};
