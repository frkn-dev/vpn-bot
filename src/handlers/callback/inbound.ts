import QRCode from "qrcode";
import { Context } from "telegraf";
import {
	getOrCreateVlessGrpcConnection,
	getOrCreateVlessXtlsConnection,
	getOrCreateVmessConnection,
	getOrCreateWireguardConnection,
	mapInboundToVless,
	mapInboundToVmess,
	vlessGrpcConn,
	vlessXtlsConn,
	vmessTcpConn,
	wireguardConn,
} from "../../proto";
import { BotState } from "../../state";

export async function handleInboundCallback(ctx: Context, botState: BotState) {
	const callbackQuery = ctx.callbackQuery;

	if (!callbackQuery || !("data" in callbackQuery)) {
		return await ctx.answerCbQuery();
	}

	const data = callbackQuery.data;
	if (!data) {
		return await ctx.answerCbQuery();
	}

	const [_, tag, nodeId] = data.split("_");

	const user = ctx.from;
	if (!user || !user.username) {
		return ctx.answerCbQuery("Не удалось определить пользователя.");
	}

	const userEntry = botState.findUserByTelegramId(user.id);
	if (!userEntry || userEntry.is_deleted) {
		return ctx.answerCbQuery("Для начала используйте /start");
	}

	const connectionData = {
		env: botState.getEnv(),
		trial: true,
		limit: botState.getDailyLimitMb(),
		proto: tag,
		user_id: userEntry.id,
	};

	try {
		const connections = await botState.getUserConnections(userEntry.id);

		console.log("connections", connections);

		if (tag === "VlessXtls") {
			const connection = await getOrCreateVlessXtlsConnection(
				connections,
				async () => {
					const res = await botState.createConnection(connectionData);
					if (res?.status === 200) {
						return res.response;
					}
					throw new Error("Ошибка создания VlessXtls-соединения");
				},
			);

			const node = await botState.getNode(nodeId);
			const inbound = node?.inbounds.VlessXtls;
			const conn_id = connection.id;
			if (inbound) {
				const vlessXtlsInb = mapInboundToVless(inbound);

				if (vlessXtlsInb && node?.address && conn_id) {
					const vlessXtlsConfig = vlessXtlsConn(
						conn_id,
						node?.address,
						vlessXtlsInb,
						node?.label,
					);
					console.log(vlessXtlsConfig);
					await ctx.editMessageText(
						`Ваша VlessXtls ссылка:\n\`\`\`\n${vlessXtlsConfig}\n\`\`\``,
						{ parse_mode: "MarkdownV2" },
					);
					const qrBuffer = await QRCode.toBuffer(vlessXtlsConfig, {
						errorCorrectionLevel: "H",
						type: "png",
						margin: 4,
						scale: 10,
					});
					await ctx.replyWithPhoto(
						{ source: qrBuffer },
						{ caption: "QR-код для VlessXtls-ссылки 🧷" },
					);
				}
			}
		} else if (tag === "VlessGrpc") {
			const connection = await getOrCreateVlessGrpcConnection(
				connections,
				async () => {
					const res = await botState.createConnection(connectionData);
					if (res?.status === 200) {
						return res.response;
					}
					throw new Error("Ошибка создания VlessGrpc-соединения");
				},
			);

			const node = await botState.getNode(nodeId);
			const inbound = node?.inbounds.VlessGrpc;
			const conn_id = connection.id;
			if (inbound && conn_id) {
				const vlessGrpcInb = mapInboundToVless(inbound);

				if (vlessGrpcInb && node?.address && conn_id) {
					console.log("connection:", connection);

					const vlessGrpcConfig = vlessGrpcConn(
						conn_id,
						node?.address,
						vlessGrpcInb,
						node?.label,
					);
					console.log(vlessGrpcConfig);
					const qrBuffer = await QRCode.toBuffer(vlessGrpcConfig, {
						errorCorrectionLevel: "H",
						type: "png",
						margin: 4,
						scale: 10,
					});
					await ctx.replyWithPhoto(
						{ source: qrBuffer },
						{ caption: "QR-код для VlessGrpc ссылки 🧷" },
					);
					await ctx.editMessageText(
						`Ваша VlessGrpc ссылка:\n\`\`\`\n${vlessGrpcConfig}\n\`\`\``,
						{ parse_mode: "MarkdownV2" },
					);
				}
			}
		} else if (tag === "Vmess") {
			const connection = await getOrCreateVmessConnection(
				connections,
				async () => {
					const res = await botState.createConnection(connectionData);
					if (res?.status === 200) {
						return res.response;
					}
					throw new Error("Ошибка создания Vmess-соединения");
				},
			);

			const node = await botState.getNode(nodeId);
			const inbound = node?.inbounds.Vmess;
			const conn_id = connection.id;
			if (inbound && conn_id) {
				const vmessInb = mapInboundToVmess(inbound);

				if (vmessInb && node?.address && conn_id) {
					console.log("connection:", connection);

					const vmessConfig = vmessTcpConn(
						conn_id,
						node?.address,
						vmessInb,
						node?.label,
					);
					console.log(vmessConfig);

					const qrBuffer = await QRCode.toBuffer(vmessConfig, {
						errorCorrectionLevel: "H",
						type: "png",
						margin: 4,
						scale: 10,
					});
					await ctx.replyWithPhoto(
						{ source: qrBuffer },
						{ caption: "QR-код для Vmess-ссылки 🧷" },
					);

					await ctx.editMessageText(
						`Ваша Vmess ссылка:\n\`\`\`\n${vmessConfig}\n\`\`\``,
						{ parse_mode: "MarkdownV2" },
					);
				}
			}
		} else if (tag === "Wireguard" && nodeId) {
			const connection = await getOrCreateWireguardConnection(
				connections,
				nodeId,
				async () => {
					const res = await botState.createConnection(connectionData);
					if (res?.status === 200) {
						return res.response;
					}
					throw new Error("Ошибка создания Wireguard-соединения");
				},
			);

			const connNodeId = connection.node_id;
			if (connNodeId) {
				const node = await botState.getNode(connNodeId);
				const ipv4 = node?.address;
				const privkey = node?.inbounds.Wireguard.wg?.privkey;
				const port = node?.inbounds.Wireguard.wg?.port;
				const dns = node?.inbounds.Wireguard.wg?.dns;

				if (ipv4 && privkey && port && dns) {
					const wgConfig = wireguardConn(
						ipv4,
						port,
						connection,
						node?.label,
						privkey,
						dns,
					);

					console.log("WG CONFIG\n", wgConfig);

					if (wgConfig) {
						await ctx.replyWithDocument({
							source: Buffer.from(wgConfig, "utf-8"),
							filename: "wg0.conf",
						});

						const qrBuffer = await QRCode.toBuffer(wgConfig, {
							errorCorrectionLevel: "H",
							type: "png",
							margin: 4,
							scale: 10,
						});

						await ctx.replyWithPhoto(
							{ source: qrBuffer },
							{ caption: "QR-код для WireGuard-конфига 🧷" },
						);
						await ctx.editMessageText(`Ваш Wireguard конфиг`, {
							parse_mode: "MarkdownV2",
						});
					}
				}
			}
		}
	} catch (err) {
		console.error("Callback error:", err);
		await ctx.reply(
			"Произошла ошибка при создании соединения. Попробуйте позже.",
		);
	}

	await ctx.answerCbQuery();
}
