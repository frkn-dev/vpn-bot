import { ConnectionResponse } from "../types/conn";

export function wireguardConn(
	ipv4: string,
	port: number,
	connection: ConnectionResponse,
	label: string,
	privateKey: string,
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
DNS        = 1.1.1.1

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
	response: ConnectionResponse[],
	nodeId: string,
	createConnection: () => Promise<ConnectionResponse>,
): Promise<ConnectionResponse> {
	const wireguardConns = response.filter((conn) => "Wireguard" in conn.proto);
	const connection = wireguardConns.find((conn) => conn.node_id === nodeId);

	if (connection) {
		return connection;
	}

	const newConn = await createConnection();
	return newConn;
}
