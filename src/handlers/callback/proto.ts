import { Context } from "telegraf";
import { BotState } from "../../state";

export async function handleProtoCallback(ctx: Context, botState: BotState) {
  const callbackQuery = ctx.callbackQuery;

  if (!callbackQuery || !("data" in callbackQuery)) {
    return await ctx.answerCbQuery();
  }

  const data = callbackQuery.data;
  if (!data) {
    return await ctx.answerCbQuery();
  }
  const proto = data!.slice("proto_".length);
  const env = botState.getEnv();

  const nodes =
    (await botState.getNodes(env))?.filter((n) => n.status === "Online") ?? [];

  const inbounds = [];

  for (const node of nodes) {
    for (const [tag, inbound] of Object.entries(node.inbounds)) {
      if (
        (proto === "xray" &&
          ["VlessGrpc", "VlessXtls", "Vmess"].includes(tag)) ||
        (proto.toLowerCase() === "wireguard" &&
          tag.toLowerCase() === "wireguard") ||
        tag === proto
      ) {
        inbounds.push({
          nodeLabel: node.label || node.hostname || "Unknown",
          nodeId: node.uuid,
          tag,
          port: inbound.port,
        });
      }
    }
  }

  if (inbounds.length === 0) {
    await ctx.editMessageText(
      `Для протокола ${proto} нет доступных конфигураций.`,
    );
    return ctx.answerCbQuery();
  }

  const buttons = inbounds.map((inb) => [
    {
      text: `${inb.nodeLabel} (${inb.tag}:${inb.nodeId.slice(0, 8)})`,
      callback_data: `inbound_${inb.tag}_${inb.nodeId}`,
    },
  ]);

  await ctx.editMessageText(`Доступные сервера ${proto}:`, {
    reply_markup: { inline_keyboard: buttons },
  });
}
