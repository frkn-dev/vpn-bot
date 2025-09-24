export async function buildSubPlainKeyboard() {
  return {
    inline_keyboard: [[{ text: "Plain", callback_data: "plain" }]],
  };
}

export async function buildSubClashKeyboard() {
  return {
    inline_keyboard: [[{ text: "Clash", callback_data: "clash" }]],
  };
}
