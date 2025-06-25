export type UUID = string; 

export type Proto = 'Vmess' | 'VlessGrpc' | 'VlessXtls' | 'Wireguard';
export type Status = 'Active' | 'Inactive' | 'Disabled';

export interface Stat {
  rx: number; 
  tx: number; 

export class Conn {
  trial: boolean;
  limit: number;
  env: string;
  proto: Proto;
  status: Status;
  stat: Stat;
  user_id?: UUID;
  created_at: string;
  modified_at: string;
  is_deleted: boolean;
  node_id?: UUID;

  constructor(data: {
    trial: boolean;
    limit: number;
    env: string;
    proto: Proto;
    status: Status;
    stat: Stat;
    user_id?: UUID;
    created_at: string;
    modified_at: string;
    is_deleted: boolean;
    node_id?: UUID;
  }) {
    this.trial = data.trial;
    this.limit = data.limit;
    this.env = data.env;
    this.proto = data.proto;
    this.status = data.status;
    this.stat = data.stat;
    this.user_id = data.user_id;
    this.created_at = data.created_at;
    this.modified_at = data.modified_at;
    this.is_deleted = data.is_deleted;
    this.node_id = data.node_id;
  }
}

