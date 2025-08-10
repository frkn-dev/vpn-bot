import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { ConnectionResponse } from "./types/conn";

export function generateConnectionKeyboard(connections: ConnectionResponse[]) {
  const keyboard: InlineKeyboardButton[][] = connections.map((conn) => {
    const protoName = "Wireguard" in conn.proto ? "WG" : "XRay";
    const label = `${protoName} — ${conn.env}`;

    return [
      {
        text: label,
        callback_data: `conn:${conn.id}`,
      },
    ];
  });

  return {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };
}

export async function buildProtoKeyboard(): Promise<any> {
  return {
    inline_keyboard: [
      [
        { text: "Xray", callback_data: "proto_xray" },
        { text: "Wireguard", callback_data: "proto_wireguard" },
        // { text: "Shadowsocks", callback_data: "proto_ss" },
      ],
    ],
  };
}

export async function buildSubKeyboard(): Promise<any> {
  return {
    inline_keyboard: [
      [
        { text: "Clash", callback_data: "sub_clash" },
        { text: "Plain", callback_data: "sub_plain" },
      ],
    ],
  };
}
