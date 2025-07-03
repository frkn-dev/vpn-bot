import { Mutex } from 'async-mutex';
import axios from 'axios';
import { RegisterResult, User } from './types';

import { ConnectionResponse, ConnectionsResponseEntryRaw, CreateConnectionRequest, CreateConnectionResponse } from './types/conn';
import { NodeResponse } from './types/node';

import { generatePassword } from './utils';

export class BotState {
  private users: Map<string, User> = new Map();
  private mutex = new Mutex();

  private dailyLimitMb = parseInt(process.env.DAILY_LIMIT_MB || '1024');
  private env = process.env.ENV || 'tg';

  private api;

  constructor(apiBaseUrl: string, apiAuthToken: string) {
    this.api = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        Authorization: `Bearer ${apiAuthToken}`,
      },
    });
  }

  async registerUserReq(username: string, telegramId: number): Promise<RegisterResult> {
    try {
      const res = await this.api.post<{
        status: number;
        message: string;
        response: { id: string };
      }>('/user', {
        username,
        telegram_id: telegramId,
        password: generatePassword(10),
        env: "tg"
      });

      if (res.data.status === 200 && res.data.response?.id) {
        return { type: 'ok', id: res.data.response.id };
      } else {
        console.warn('Registration failed:', res.data.message);
        return { type: 'error' };
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          return { type: 'already_exists' };
        } else {
          console.error(`HTTP error ${err.response?.status}:`, err.response?.data);
        }
      } else {
        console.error('Unexpected error:', err);
      }

      return { type: 'error' };
    }
  }

  async getUsersReq(): Promise<User[]> {
    const res = await this.api.get<{
      status: number;
      message: string;
      response: [string, User][];
    }>('/users');

    return res.data.response.map(([id, data]) => ({
      id: id,
      telegram_id: data.telegram_id,
      username: data.username,
      is_deleted: data.is_deleted,
    }));
  }

  async addUsers(users: User[]): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.users.clear();
      for (const user of users) {
        this.users.set(user.id, user);
      }
    });
  }

  getEnv(): string {
    return this.env;
  }

  getDailyLimitMb(): number {
    return this.dailyLimitMb;
  }

  getUser(username: string): User | undefined {
    return this.users.get(username);
  }

  findUserByTelegramId(telegramId: number): User | undefined {
    for (const user of this.users.values()) {
      if (user.telegram_id === telegramId) {
        return user;
      }
    }
    return undefined;
  }


  async addUser(id: string, data: User): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.users.set(id, data);
    });
  }

  async getUserConnections(userId: string): Promise<ConnectionResponse[]> {
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
      console.error('Error fetching nodes', e);
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
      console.error('Error fetching nodes', e);
      return null;
    }
  }

  async createConnection(payload: CreateConnectionRequest): Promise<CreateConnectionResponse | null> {
    try {
      const res = await this.api.post<CreateConnectionResponse>('/connection', payload);

      if (res.data.status === 200) {
        return res.data;
      } else {
        console.warn('Failed to create connection:', res.data.message);
        return null;
      }
    } catch (e) {
      console.error('Error creating connection:', e);
      return null;
    }
  }

  async buildProtoKeyboard(): Promise<any> {
    return {
      inline_keyboard: [
        [
          { text: 'Xray', callback_data: 'proto_xray' },
          { text: 'Wireguard', callback_data: 'proto_wireguard' },
          { text: 'Shadowsocks', callback_data: 'proto_ss' },
        ],
      ],
    };
  }


}
