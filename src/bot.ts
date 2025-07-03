import axios from 'axios';
import { Buffer } from "buffer";
import * as dotenv from 'dotenv';
import QRCode from 'qrcode';
import { Telegraf } from 'telegraf';
import { protoHandler } from './handlers/proto';
import { startHandler } from './handlers/start';
import { getOrCreateVlessGrpcConnection, getOrCreateVlessXtlsConnection, mapInboundToVless, vlessXtlsConn, vlessGrpcConn } from './proto/vless';
import { mapInboundToVmess } from './proto/vmess';
import { generateWireguardConfig, getOrCreateWireguardConnection } from './proto/wireguard';
import { BotState } from './state';
import { getOrCreateVmessConnection, vmessTcpConn } from './proto/vmess';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL;

if (!BOT_TOKEN || !API_BASE_URL) {
  throw new Error('BOT_TOKEN or API_BASE_URL are missed in  .env');
}

const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;
if (!API_AUTH_TOKEN) {
  throw new Error('API_AUTH_TOKEN env variable is required');
}

const bot = new Telegraf(BOT_TOKEN);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    Authorization: `Bearer ${API_AUTH_TOKEN}`,
  },
});

const botState = new BotState(API_BASE_URL, API_AUTH_TOKEN);

(async () => {
  try {
    const users = await botState.getUsersReq();
    await botState.addUsers(users);
    console.log(`Users loaded: ${users.length}`);
    console.log(JSON.stringify(users, null, 2));

  } catch (err) {
    console.error('Error loading users:', err);
    process.exit(1);
  }

  bot.command('start', (ctx) => startHandler(ctx, botState));
  bot.command('proto', (ctx) => protoHandler(ctx, botState));

  bot.on('callback_query', async (ctx) => {
    try {
      const callbackQuery = ctx.callbackQuery;

      if (!callbackQuery || !('data' in callbackQuery)) {
        return await ctx.answerCbQuery();
      }

      const callbackData = callbackQuery.data;
      if (!callbackData) {
        return await ctx.answerCbQuery();
      }

      if (callbackData.startsWith('proto_')) {
        const proto = callbackData.slice('proto_'.length);
        const env = botState.getEnv();

        const nodes = (await botState.getNodes(env))?.filter(n => n.status === 'Online') ?? [];

        const inbounds: { nodeLabel: string; nodeId: string, tag: string; port: number }[] = [];

        for (const node of nodes) {
          for (const [tag, inbound] of Object.entries(node.inbounds)) {
            if (
              (proto === 'xray' && ['VlessGrpc', 'VlessXtls', 'Vmess'].includes(tag)) ||
              (proto.toLowerCase() === 'wireguard' && tag.toLowerCase() === 'wireguard') ||
              tag === proto
            ) {
              inbounds.push({
                nodeLabel: node.label || node.hostname || 'Unknown',
                nodeId: node.uuid,
                tag,
                port: inbound.port,
              });
            }
          }
        }

        if (inbounds.length === 0) {
          await ctx.editMessageText(`Для протокола ${proto} нет доступных конфигураций.`);
          return await ctx.answerCbQuery();
        }
 
        const buttons = inbounds.map(inb => ([{
          text: `${inb.nodeLabel} (${inb.tag}:${inb.nodeId.slice(0, 8)})`,
          callback_data: `inbound_${inb.tag}_${inb.nodeId}`,
        }]));

        await ctx.editMessageText(`Доступные сервера ${proto}:`, {
          reply_markup: { inline_keyboard: buttons },
        });

        await ctx.answerCbQuery();
        return;
      }

      if (callbackData.startsWith('inbound_')) {
        const parts = callbackData.split('_');
        if (parts.length >= 3) {
          const tag = parts[1];
          const nodeId = parts[2];
          const user = ctx.from;
          if (!user || !user.username) {
            await ctx.answerCbQuery('Не удалось определить пользователя.');
            return;
          }

          const userEntry = botState.findUserByTelegramId(user.id);
          if (!userEntry || userEntry.is_deleted) {
            await ctx.answerCbQuery('Для начала используйте /start');
            return;
          }

          const connectionData = {
            env: botState.getEnv(),
            trial: true,
            limit: botState.getDailyLimitMb(),
            proto: tag,
            user_id: userEntry.id,
          };

          try {

            console.log("TAG", tag);
  
            const connections = await botState.getUserConnections(userEntry.id);

            if (tag === 'VlessXtls') {
              const connection = await getOrCreateVlessXtlsConnection(connections, async () => {
                const res = await botState.createConnection(connectionData);
                if (res?.status === 200) {
                  return res.response;
                }
                throw new Error('Ошибка создания VlessXtls-соединения');
              });

              const node = await botState.getNode(nodeId);
              const inbound = node?.inbounds.VlessXtls;
              const conn_id = connection.id;
              if (inbound) {
                const vlessXtlsInb = mapInboundToVless(inbound);

                if (vlessXtlsInb && node?.address && conn_id) {
                  const vlessXtlsConfig = vlessXtlsConn(conn_id, node?.address, vlessXtlsInb, node?.label);
                  console.log(vlessXtlsConfig);
                  await ctx.editMessageText(
                    `Ваша VlessXtls ссылка:\n\`\`\`\n${vlessXtlsConfig}\n\`\`\``,
                    { parse_mode: "MarkdownV2" }
                  );
                }
              }
            } 

            else if (tag === 'VlessGrpc') {
              const connection = await getOrCreateVlessGrpcConnection(connections, async () => {
                const res = await botState.createConnection(connectionData);
                if (res?.status === 200) {
                  return res.response;
                }
                throw new Error('Ошибка создания VlessGrpc-соединения');
              });

              const node = await botState.getNode(nodeId);
              const inbound = node?.inbounds.VlessGrpc;
              const conn_id = connection.id;
              if (inbound && conn_id) {
                const vlessGrpcInb = mapInboundToVless(inbound);

                if (vlessGrpcInb && node?.address && conn_id) {
                  console.log("connection:", connection);

                  const vlessGrpcConfig = vlessGrpcConn(conn_id, node?.address, vlessGrpcInb, node?.label);
                  console.log(vlessGrpcConfig);
                  await ctx.editMessageText(
                    `Ваша VlessGrpc ссылка:\n\`\`\`\n${vlessGrpcConfig}\n\`\`\``,
                    { parse_mode: "MarkdownV2" }
                  );
                }
              }
            } 

            else if (tag === 'Vmess') {
              const connection = await getOrCreateVmessConnection(connections, async () => {
                const res = await botState.createConnection(connectionData);
                if (res?.status === 200) {
                  return res.response;
                }
                throw new Error('Ошибка создания Vmess-соединения');
              });

              const node = await botState.getNode(nodeId);
              const inbound = node?.inbounds.Vmess;
              const conn_id = connection.id;
              if (inbound && conn_id) {
                const vmessInb = mapInboundToVmess(inbound);

                if (vmessInb && node?.address && conn_id) {
                  console.log("connection:", connection);

                  const vmessConfig = vmessTcpConn(conn_id, node?.address, vmessInb, node?.label);
                  console.log(vmessConfig);
                  await ctx.editMessageText(
                    `Ваша Vmess ссылка:\n\`\`\`\n${vmessConfig}\n\`\`\``,
                    { parse_mode: "MarkdownV2" }
                  );
                }
              }
            } 

            else if (tag === 'Wireguard' && nodeId) {
              const connection = await getOrCreateWireguardConnection(connections, nodeId, async () => {
                const res = await botState.createConnection(connectionData);
                if (res?.status === 200) {
                  return res.response;
                }
                throw new Error('Ошибка создания Wireguard-соединения');
              });

              const connNodeId = connection.node_id;
              if (connNodeId) {
                const node = await botState.getNode(connNodeId);
                const ipv4 = node?.address;
                const privkey = node?.inbounds.Wireguard.wg?.privkey;
                const port = node?.inbounds.Wireguard.wg?.port;

                if (ipv4 && privkey && port) {
                  const wgConfig = generateWireguardConfig(ipv4, port, connection, node?.label, privkey);

                  console.log("WG CONFIG\n", wgConfig);

                  if (wgConfig) {
                    await ctx.replyWithDocument({
                      source: Buffer.from(wgConfig, 'utf-8'),
                      filename: 'wg0.conf',
                    });

                    const qrBuffer = await QRCode.toBuffer(wgConfig, {
                      errorCorrectionLevel: 'H',
                      type: 'png',
                      margin: 1,
                      scale: 6,
                    });

                    await ctx.replyWithPhoto({ source: qrBuffer }, { caption: 'QR-код для WireGuard-конфига 🧷' });
                    await ctx.editMessageText(
                      `Ваш Wireguard конфиг`,
                      { parse_mode: "MarkdownV2" }
                    );
                  }
                }
              }
            } else {
              await ctx.editMessageText(`Ошибка создания соединения`);
            }
          } catch (e) {
            console.error('Ошибка при создании соединения:', e);
            await ctx.editMessageText('Ошибка сервера при создании соединения.');
          }

          await ctx.answerCbQuery();
        } else {
          await ctx.answerCbQuery('Неверные данные.');
        }
        return;
      }

      await ctx.answerCbQuery();

    } catch (err) {
      console.error('Callback query error:', err);
      await ctx.answerCbQuery('Произошла ошибка, попробуйте снова');
    }
  });


  bot.launch();
  console.log('->> Bot started');
})();
