import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { ConnectionResponse } from "./types/conn";

export async function buildSubPlainKeyboard(): Promise<any> {
  return {
    inline_keyboard: [
      [{ text: "Получить VPN Ссылку", callback_data: "plain" }],
    ],
  };
}

export async function buildSubClashKeybard(): Promise<any> {
  return {
    inline_keyboard: [
      [{ text: "Получить VPN Ссылку", callback_data: "clash" }],
    ],
  };
}
