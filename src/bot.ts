import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { BotState } from './state';
import { startHandler } from './handlers/start';
import { protoHandler } from './handlers/proto';

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

        const inbounds: { nodeLabel: string; tag: string; port: number }[] = [];

        for (const node of nodes) {
          for (const [tag, inbound] of Object.entries(node.inbounds)) {
            if (
              (proto === 'xray' && ['VlessGrpc', 'VlessXtls', 'Vmess'].includes(tag)) ||
              (proto.toLowerCase() === 'wireguard' && tag.toLowerCase() === 'wireguard') ||
              tag === proto
            ) {
              inbounds.push({
                nodeLabel: node.label || node.hostname || 'Unknown',
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
          text: `${inb.nodeLabel} (${inb.tag}:${inb.port})`,
          callback_data: `inbound_${inb.tag}_${inb.port}`,
        }]));

        await ctx.editMessageText(`Инбаунды протокола ${proto}:`, {
          reply_markup: { inline_keyboard: buttons },
        });

        await ctx.answerCbQuery();
        return;
      }

      if (callbackData.startsWith('inbound_')) {
        const parts = callbackData.split('_');
        if (parts.length >= 3) {
          const tag = parts[1];
          const port = parts[2];
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
            const res = await botState.createConnection(connectionData);
            if (res) {
              await ctx.editMessageText(`Соединение с протоколом ${tag} создано!`);
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
