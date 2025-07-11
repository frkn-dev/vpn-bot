import { WireguardResponse, XrayResponse } from "./types/conn";

export function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}:\"<>?|[];',./`~";
  let password = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    password += chars[idx];
  }
  return password;
}

export function isXrayResponse(
  proto: WireguardResponse | XrayResponse,
): proto is XrayResponse {
  return (proto as XrayResponse).Xray !== undefined;
}

export function generateUsername(totalLength = 25): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = "anonymous";
  const remaining = totalLength - prefix.length;

  let suffix = "";
  for (let i = 0; i < remaining; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    suffix += chars[idx];
  }

  return prefix + suffix;
}
