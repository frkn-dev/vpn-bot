import { Mutex } from "async-mutex";
import axios from "axios";
import { RegisterResult, User } from "./types";
import { NodeScore } from "./types/node";

import {
  ConnectionResponse,
  ConnectionsResponseEntryRaw,
  CreateConnectionRequest,
  CreateConnectionResponse,
} from "./types/conn";
import { NodeResponse } from "./types/node";

import { UserStat, UserStatRaw } from "./types/stat";
import { generatePassword } from "./utils";

export class BotState {
  private users: Map<string, User> = new Map();
  private mutex = new Mutex();

  private dailyLimitMb = parseInt(process.env.DAILY_LIMIT_MB || "1024");
  private env = process.env.ENV || "tg";

  private apiBaseUrl: string;
  private googleScriptUrl: string;
  private googleScriptToken: string;
  private adminChatId: string;
  private api;

  constructor(
    apiBaseUrl: string,
    apiAuthToken: string,
    googleScriptUrl: string,
    googleScriptToken: string,
    adminChatId: string,
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.googleScriptUrl = googleScriptUrl;
    this.googleScriptToken = googleScriptToken;
    this.adminChatId = adminChatId;
    this.api = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        Authorization: `Bearer ${apiAuthToken}`,
      },
    });
  }

  getEnv(): string {
    return this.env;
  }

  getDailyLimitMb(): number {
    return this.dailyLimitMb;
  }

  getGoogleScriptUrl(): string {
    return this.googleScriptUrl;
  }

  getGoogleScriptToken(): string {
    return this.googleScriptToken;
  }

  getAdminChatId(): string {
    return this.adminChatId;
  }

  getUser(username: string): User | undefined {
    return this.users.get(username);
  }

  getUserByUsername(username: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  findUserByTelegramId(telegramId: number): User | undefined {
    for (const user of this.users.values()) {
      if (user.telegram_id === telegramId) {
        return user;
      }
    }
    return undefined;
  }

  findUserByTelegramUsername(username: String): User | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async addUsers(users: User[]): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.users.clear();
      for (const user of users) {
        this.users.set(user.id, user);
      }
    });
  }

  async addUser(id: string, data: User): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.users.set(id, data);
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      const user = this.users.get(id);
      if (user) {
        this.users.set(id, { ...user, is_deleted: true });
      }
    });
  }

  async undeleteUser(id: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      const user = this.users.get(id);
      if (user) {
        this.users.set(id, { ...user, is_deleted: false });
      }
    });
  }

  async registerUserReq(
    telegramId: number,
    username: string,
  ): Promise<RegisterResult> {
    try {
      const res = await this.api.post<{
        status: number;
        message: string;
        response: { id: string };
      }>("/user", {
        username,
        telegram_id: telegramId,
        password: generatePassword(10),
        env: "tg",
        limit: this.dailyLimitMb,
      });

      if (res.data.status === 200 && res.data.response?.id) {
        return { type: "ok", id: res.data.response.id };
      } else {
        console.warn("Registration failed:", res.data.message);
        return { type: "error" };
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          return { type: "already_exists" };
        } else {
          console.error(
            `HTTP error ${err.response?.status}:`,
            err.response?.data,
          );
        }
      } else {
        console.error("Unexpected error:", err);
      }

      return { type: "error" };
    }
  }

  async deleteUserReq(userId: string): Promise<RegisterResult> {
    try {
      const res = await this.api.delete<{
        status: number;
        message: string;
        response: { id: string };
      }>("/user", {
        params: { user_id: userId },
      });

      if (res.data.status === 200 && res.data.response?.id) {
        return { type: "ok", id: res.data.response.id };
      } else {
        console.warn("Delete failed:", res.data.message);
        return { type: "error" };
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          return { type: "not_found" };
        } else {
          console.error(
            `HTTP error ${err.response?.status}:`,
            err.response?.data,
          );
        }
      } else {
        console.error("Unexpected error:", err);
      }
      return { type: "error" };
    }
  }

  async undeleteUserReq(userId: string): Promise<RegisterResult> {
    try {
      const res = await this.api.put<{
        status: number;
        message: string;
        response: { id: string };
      }>("/user", { is_deleted: false }, { params: { user_id: userId } });

      if (res.data.status === 200 && res.data.response?.id) {
        return { type: "ok", id: res.data.response.id };
      } else {
        console.warn("Undelete failed:", res.data.message);
        return { type: "error" };
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          return { type: "already_exists" };
        } else {
          console.error(
            `HTTP error ${err.response?.status}:`,
            err.response?.data,
          );
        }
      } else {
        console.error("Unexpected error:", err);
      }

      return { type: "error" };
    }
  }

  async getUsersReq(): Promise<User[]> {
    const res = await this.api.get<{
      status: number;
      message: string;
      response: [string, User][];
    }>("/users");

    return res.data.response.map(([id, data]) => ({
      id: id,
      telegram_id: data.telegram_id,
      username: data.username,
      is_deleted: data.is_deleted,
    }));
  }

  async getUserConnections(userId: string): Promise<ConnectionResponse[]> {
    try {
      const res = await this.api.get<{
        status: number;
        message: string;
        response: ConnectionsResponseEntryRaw[];
      }>(`/user/connections?user_id=${userId}`);

      if (res.data.status !== 200) return [];

      return res.data.response.map(([id, conn]) => ({
        ...conn,
        id,
      }));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return [];
      }

      throw err;
    }
  }

  async getNodes(env: string): Promise<NodeResponse[] | null> {
    try {
      const res = await this.api.get<{
        status: number;
        message: string;
        response: NodeResponse[];
      }>(`/nodes?env=${env}`);

      return res.data.status === 200 ? res.data.response : null;
    } catch (e) {
      console.error("Error fetching nodes", e);
      return null;
    }
  }

  async getNode(id: string): Promise<NodeResponse | null> {
    try {
      const res = await this.api.get<{
        status: number;
        message: string;
        response: NodeResponse;
      }>(`/node?node_id=${id}`);

      return res.data.status === 200 ? res.data.response : null;
    } catch (e) {
      console.error("Error fetching nodes", e);
      return null;
    }
  }

  async getNodeScore(uuid: string): Promise<NodeScore | null> {
    try {
      const res = await this.api.get<{
        status: number;
        message: string;
        response: NodeScore | null;
      }>(`/node/score?node_id=${uuid}`);

      if (res.data.status === 200 && res.data.response) {
        return res.data.response;
      } else {
        console.warn(`⚠️ Failed to get score for node ${uuid}`, res.data);
        return null;
      }
    } catch (err) {
      console.error(`❌ Error fetching score for node ${uuid}`, err);
      return null;
    }
  }

  getSubLink(userId: string, format: string): string {
    const link = `${this.apiBaseUrl}/sub?user_id=${userId}&format=${format}`;
    return link;
  }

  async getUserStat(userId: string): Promise<UserStat[] | null> {
    try {
      const res = await this.api.get<{
        status: number;
        message: string;
        response: UserStatRaw[];
      }>(`/user/stat?user_id=${userId}`);

      if (res.data.status !== 200 || !res.data.response) {
        return null;
      }

      const userStats: UserStat[] = res.data.response.map(
        ([id, stat, type, status, limit, trial]) => ({
          id,
          stat,
          type,
          status,
          limit,
          trial,
        }),
      );

      return userStats;
    } catch (e) {
      console.error("Error fetching user stats", e);
      return null;
    }
  }

  async createConnection(
    payload: CreateConnectionRequest,
  ): Promise<CreateConnectionResponse | null> {
    try {
      const res = await this.api.post<CreateConnectionResponse>(
        "/connection",
        payload,
      );

      if (res.data.status === 200) {
        return res.data;
      } else {
        console.warn("Failed to create connection:", res.data.message);
        return null;
      }
    } catch (e) {
      console.error("Error creating connection:", e);
      return null;
    }
  }
}
