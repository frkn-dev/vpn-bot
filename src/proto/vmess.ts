import { ConnectionResponse } from "../types/conn";
import { Inbound, ProtoResponse } from "../types/node";
import { isXrayResponse } from "../utils";

export function vmessTcpConn(
	connId: string,
	ipv4: string,
	inbound: ProtoResponse["Vmess"],
	label: string,
): string {
	if (!inbound) {
		throw new Error("vlessProto is undefined");
	}
	if (!inbound.stream_settings)
		throw new Error("VMESS: missing stream_settings");
	const tcpSettings = inbound.stream_settings.tcpSettings;
	if (!tcpSettings) throw new Error("VMESS: missing tcpSettings");
	const header = tcpSettings.header;
	if (!header) throw new Error("VMESS: missing header");
	const req = header.request;
	if (!req) throw new Error("VMESS: missing request");
	const headers = req.headers;
	if (!headers) throw new Error("VMESS: missing headers");

	const hostArray = headers["Host"];
	if (!hostArray || hostArray.length === 0)
		throw new Error("VMESS: missing Host header");
	const host = hostArray[0];

	const path = req.path?.[0];
	if (!path) throw new Error("VMESS: missing path");

	const port = inbound.port;

	const conn: Record<string, string> = {
		add: ipv4,
		aid: "0",
		host,
		id: connId,
		net: "tcp",
		path,
		port: port.toString(),
		ps: `Vmess ${label}`,
		scy: "auto",
		tls: "none",
		type: "http",
		v: "2",
	};

	const jsonStr = JSON.stringify(conn);
	const base64Str = Buffer.from(jsonStr).toString("base64");

	return `vmess://${base64Str}#${label} ____`;
}

export async function getOrCreateVmessConnection(
	response: ConnectionResponse[] | null | undefined,
	createConnection: () => Promise<ConnectionResponse>,
): Promise<ConnectionResponse> {
	if (!response || response.length === 0) {
		return await createConnection();
	}

	const vmessConnection = response.find(
		(conn) => isXrayResponse(conn.proto) && conn.proto.Xray === "Vmess",
	);

	if (vmessConnection) {
		console.log("VMESS", vmessConnection);
		return vmessConnection;
	}

	return await createConnection();
}

export function mapInboundToVmess(inbound: Inbound): ProtoResponse["Vmess"] {
	return {
		tag: inbound.tag,
		port: inbound.port,
		stream_settings: inbound.stream_settings
			? {
					tcpSettings:
						inbound.stream_settings.tcpSettings ?? undefined,
					realitySettings:
						inbound.stream_settings.realitySettings ?? undefined,
					grpcSettings:
						inbound.stream_settings.grpcSettings ?? undefined,
				}
			: undefined,
	};
}
