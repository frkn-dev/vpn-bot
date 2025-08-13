import axios from "axios";
import { sha3_512 } from "js-sha3";
import { ActiveConnection, LoginResponse } from "./types";

const SITE_URL = process.env.SITE_URL || "https://frkn.org";

export async function connectWithMnemonic(
  mnemonic: string
): Promise<string | ActiveConnection> {
  const passwordHash = sha3_512(mnemonic);

  try {
    const loginResp = await axios.post<LoginResponse>(
      SITE_URL + "/api/login",
      { password: passwordHash },
      { headers: { "Content-Type": "application/json" } }
    );

    if (loginResp.data.status === "error") {
      return loginResp.data.message;
    }

    const connectResp = await axios.get<ActiveConnection>(
      SITE_URL + "/api/connect",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: loginResp.data.token,
        },
      }
    );

    return connectResp.data;
  } catch (error) {
    console.error("connectWithMnemonic failed:", error);
    return "Failed to connect to server. Please try again later.";
  }
}
