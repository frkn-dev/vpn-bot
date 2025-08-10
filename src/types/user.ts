export interface User {
  telegram_id?: number;
  username: string;
  id: string;
  is_deleted: boolean;
}

export type RegisterResult =
  | { type: "ok"; id: string }
  | { type: "already_exists" }
  | { type: "error" }
  | { type: "not_found" };
