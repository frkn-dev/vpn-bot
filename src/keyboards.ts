import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { ConnectionResponse } from "./types/conn";

export async function buildSubPlainKeyboard(): Promise<any> {
  return {
    inline_keyboard: [[{ text: "Plain", callback_data: "plain" }]],
  };
}

export async function buildSubClashKeyboard(): Promise<any> {
  return {
    inline_keyboard: [[{ text: "Clash", callback_data: "clash" }]],
  };
}
