import { PrismaClient, User as PrismaUser } from "@prisma/client";
import axios from "axios";
import { RegisterResult, User } from "./types";
import {
  ConnectionResponse,
  ConnectionsResponseEntryRaw,
  CreateConnectionRequest,
  CreateConnectionResponse,
} from "./types/conn";
import { NodeResponse, NodeScore } from "./types/node";
import { UserStat, UserStatRaw } from "./types/stat";
import { generatePassword } from "./utils";

export class BotState {
  private prisma: PrismaClient;

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

    this.prisma = new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });

    this.connectToDatabase();
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log("Connected to database successfully");
    } catch (error) {
      console.error("Error connecting to database:", error);
      throw error;
    }
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

  private mapPrismaUserToUser(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      telegram_id: prismaUser.telegramId
        ? Number(prismaUser.telegramId)
        : undefined,
      username: prismaUser.username,
      is_deleted: prismaUser.isDeleted,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const prismaUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (prismaUser) {
        return this.mapPrismaUserToUser(prismaUser);
      }
    } catch (error) {
      console.error("Error fetching user from database:", error);
    }

    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const prismaUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (prismaUser) {
        return this.mapPrismaUserToUser(prismaUser);
      }
    } catch (error) {
      console.error("Error fetching user by username from database:", error);
    }

    return undefined;
  }

  async findUserByTelegramId(telegramId: number): Promise<User | undefined> {
    try {
      const prismaUser = await this.prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (prismaUser) {
        return this.mapPrismaUserToUser(prismaUser);
      }
    } catch (error) {
      console.error("Error fetching user by telegram_id from database:", error);
    }

    return undefined;
  }

  async findUserByTelegramUsername(
    username: string,
  ): Promise<User | undefined> {
    return this.getUserByUsername(username);
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isDeleted: true,
          modifiedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error deleting user in database:", error);
      throw error;
    }
  }

  async undeleteUser(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isDeleted: false,
          modifiedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error undeleting user in database:", error);
      throw error;
    }
  }

  async registerUser(
    telegramId: number,
    username: string,
  ): Promise<RegisterResult> {
    try {
      const password = generatePassword(10);

      const prismaUser = await this.prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
          username: username,
          password: password,
          env: this.getEnv(),
          dailyLimitMb: this.dailyLimitMb,
        },
      });

      return { type: "ok", id: prismaUser.id };
    } catch (error: any) {
      console.error("Registration error:", error);

      if (error.code === "P2002") {
        return { type: "already_exists" };
      }

      return { type: "error" };
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const prismaUsers = await this.prisma.user.findMany({
        orderBy: { createdAt: "asc" },
      });

      return prismaUsers.map((prismaUser) =>
        this.mapPrismaUserToUser(prismaUser),
      );
    } catch (error) {
      console.error("Error fetching users from database:", error);
      return [];
    }
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

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
