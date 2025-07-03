export type ProtoTag = 'Vmess' | 'VlessGrpc' | 'VlessXtls' | 'Wireguard';

export enum NodeStatus {
  Online = 'Online',
  Offline = 'Offline',
}

export type ProtoResponse = {
  Vless?: {
    tag: string;
    port: number;
    stream_settings?: StreamSettings;
  };
  Vmess?: {
    tag: string;
    port: number;
    stream_settings?: StreamSettings;
  };
};

export type StreamSettings = {
  tcpSettings?: TcpSettings;
  realitySettings?: RealitySettings;
  grpcSettings?: GrpcSettings;
};

export type TcpHeader = {
  type: string;
  request?: TcpRequest;
};

export type TcpRequest = {
  method: string;
  path: string[];
  headers?: Record<string, string[]>;
};

export type GrpcSettings = {
  serviceName: string;
};

export interface RealitySettings {
  serverNames: string[];
  privateKey: string;
  publicKey: string;
  shortIds: string[];
  dest: string;
}

export interface TcpSettings {
  header: {
    type: string;
    request: {
      method: string;
      path: string[];
      headers: {
        Host: string[];
      };
    };
  };
}

export interface WgSettings {
  pubkey: string;
  privkey: string;
  interface: string;
  network: {
    ip: string;
    cidr: number;
  };
  address: string;
  port: number;
}

export interface Inbound {
  tag: ProtoTag;
  port: number;
  stream_settings: {
    tcpSettings: TcpSettings | null;
    realitySettings: RealitySettings | null;
    grpcSettings: GrpcSettings | null;
  } | null;
  wg: WgSettings | null;
}

export interface NodeResponse {
  uuid: string;
  env: string;
  hostname: string;
  address: string;
  label: string;
  status: NodeStatus;
  inbounds: Record<ProtoTag, Inbound>;
}
