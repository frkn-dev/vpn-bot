export interface User {
  telegram_id?: number;
  username: string;
  id: string;
  is_deleted: boolean;
  trial: boolean;
  expired_at: Date | null;
}

export type RegisterResult =
  | { type: "ok"; id: string }
  | { type: "already_exists" }
  | { type: "error" }
  | { type: "not_found" };
