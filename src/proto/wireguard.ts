import { ConnectionResponse } from "../types/conn";

export function wireguardConn(
	host: string,
	pubkey: string,
	port: number,
	connection: ConnectionResponse,
	label: string,
	dns: string[],
): string | null {
	if (!("Wireguard" in connection.proto)) {
		console.error("Wrong proto", connection.proto);
		return null;
	}

	const connId = connection.id;
	const wg = connection.proto.Wireguard;
	const privkey = wg.param.keys.privkey;
	const clientIp = `${wg.param.address.addr}/${wg.param.address.cidr}`;

	const config = `[Interface]
PrivateKey = ${privkey}
Address    = ${clientIp}
DNS        = ${dns}

[Peer]
PublicKey           = ${pubkey}
Endpoint            = ${host}:${port}
AllowedIPs          = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

# ${label} — conn_id: ${connId}
`;

	return config;
}

export async function getOrCreateWireguardConnection(
	response: ConnectionResponse[] | null | undefined,
	nodeId: string,
	createConnection: () => Promise<ConnectionResponse>,
): Promise<ConnectionResponse> {
	if (!response || response.length === 0) {
		return await createConnection();
	}

	const connection = response.find(
		(conn) => "Wireguard" in conn.proto && conn.node_id === nodeId,
	);

	console.log("getOrCreateWireguardConnection: connection", connection);

	if (connection) {
		return connection;
	}

	return await createConnection();
}
