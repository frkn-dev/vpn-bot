
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { ConnectionResponse } from './types/conn';

export function generateConnectionKeyboard(connections: ConnectionResponse[]) {
  const keyboard: InlineKeyboardButton[][] = connections.map(conn => {
    const protoName = 'Wireguard' in conn.proto ? 'WG' : 'XRay';
    const label = `${protoName} — ${conn.env}`;

    return [{
      text: label,
      callback_data: `conn:${conn.id}`,
    }];
  });

  return {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };
}


