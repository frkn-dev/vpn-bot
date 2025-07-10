export type CreateConnectionRequest = {
	env: string;
	trial: boolean;
	limit: number;
	proto: string;
	user_id: string;
	node_id?: string;
};

export type WireguardResponse = {
	Wireguard: {
		param: {
			keys: {
				privkey: string;
				pubkey: string;
			};
			address: {
				addr: string;
				cidr: number;
			};
		};
		node_id: string;
	};
};

export type XrayResponse = {
	Xray: string;
};

export type ConnectionResponse = {
	id: string;
	trial: boolean;
	limit: number;
	env: string;
	proto: WireguardResponse | XrayResponse;
	status: string;
	stat: {
		downlink: number;
		uplink: number;
		online: number;
	};
	user_id: string;
	created_at: string;
	modified_at: string;
	is_deleted: boolean;
	node_id: string | null;
};

export type CreateConnectionResponse = {
	status: number;
	message: string;
	response: ConnectionResponse;
};

export type ConnectionsResponseEntry = [string, ConnectionResponse];
export type ConnectionResponseRaw = Omit<ConnectionResponse, "id">;
export type ConnectionsResponseEntryRaw = [string, ConnectionResponseRaw];
