import { ConnectionResponse } from "../types/conn";

export function wireguardConn(
	ipv4: string,
	port: number,
	connection: ConnectionResponse,
	label: string,
	privateKey: string,
	dns: string[],
): string | null {
	if (!("Wireguard" in connection.proto)) {
		console.error("Wrong proto", connection.proto);
		return null;
	}

	const connId = connection.id;
	const wg = connection.proto.Wireguard;
	const serverPubKey = wg.param.keys.pubkey;
	const clientIp = `${wg.param.address.ip}/${wg.param.address.cidr}`;
	const host = ipv4;

	const config = `[Interface]
PrivateKey = ${privateKey}
Address    = ${clientIp}
DNS        = ${dns}

[Peer]
PublicKey           = ${serverPubKey}
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

	if (connection) {
		return connection;
	}

	return await createConnection();
}
