import type { ProtoTag } from "./node";

export type Status = "Active" | "Expired";
export type UserStatRaw = [
  string,
  TrafficStat,
  ProtoTag,
  Status,
  number,
  boolean,
];

export interface TrafficStat {
  downlink: number;
  uplink: number;
  online: number;
}

export interface UserStat {
  id: string;
  stat: TrafficStat;
  type: ProtoTag;
}
