import { ConnectionResponse } from "../types/conn";
import { Inbound, ProtoResponse } from "../types/node";
import { isXrayResponse } from "../utils";

export function vlessXtlsConn(
	connId: string,
	ipv4: string,
	vlessProto: ProtoResponse["Vless"],
	label: string,
): string {
	if (!vlessProto) {
		throw new Error("vlessProto is undefined");
	}

	const port = vlessProto.port;
	const streamSettings = vlessProto.stream_settings;
	if (!streamSettings?.realitySettings) {
		throw new Error("VLESS XTLS: reality settings error");
	}

	const realitySettings = streamSettings.realitySettings;
	const pbk = realitySettings.publicKey;
	const sid = realitySettings.shortIds[0];
	if (!sid) throw new Error("VLESS XTLS: reality settings SID error");
	const sni = realitySettings.serverNames[0];
	if (!sni) throw new Error("VLESS XTLS: reality settings SNI error");

	return `vless://${connId}@${ipv4}:${port}?security=reality&flow=xtls-rprx-vision&type=tcp&sni=${sni}&fp=chrome&pbk=${pbk}&sid=${sid}#${label} XTLS`;
}

export function vlessGrpcConn(
	connId: string,
	ip: string,
	vlessProto: ProtoResponse["Vless"],
	label: string,
): string {
	if (!vlessProto) {
		throw new Error("vlessProto is undefined");
	}
	const port = vlessProto.port;
	const stream = vlessProto.stream_settings;

	if (!stream) {
		throw new Error("VLESS GRPC: stream settings error");
	}

	const reality = stream.realitySettings;
	if (!reality) {
		throw new Error("VLESS GRPC: reality settings error");
	}

	const grpc = stream.grpcSettings;
	if (!grpc) {
		throw new Error("VLESS GRPC: grpc settings error");
	}

	const serviceName = grpc.serviceName;
	const pbk = reality.publicKey;
	const sid = reality.shortIds?.find((id) => id && id.length > 0);
	const sni = reality.serverNames?.[0];

	if (!sid) throw new Error("VLESS GRPC: missing short_id");
	if (!sni) throw new Error("VLESS GRPC: missing SNI");

	return `vless://${connId}@${ip}:${port}?security=reality&type=grpc&mode=gun&serviceName=${serviceName}&fp=chrome&sni=${sni}&pbk=${pbk}&sid=${sid}#${label} GRPC`;
}

export async function getOrCreateVlessXtlsConnection(
	response: ConnectionResponse[],
	createConnection: () => Promise<ConnectionResponse>,
): Promise<ConnectionResponse> {
	const vlessXtlsConnections = response.filter((conn) => {
		if (isXrayResponse(conn.proto)) {
			return conn.proto.Xray === "VlessXtls";
		}
		return false;
	});

	console.log("VLESS XTLS", vlessXtlsConnections[1]);

	if (vlessXtlsConnections.length > 0) {
		return vlessXtlsConnections[0];
	}

	return await createConnection();
}

export async function getOrCreateVlessGrpcConnection(
	response: ConnectionResponse[],
	createConnection: () => Promise<ConnectionResponse>,
): Promise<ConnectionResponse> {
	const vlessGrpcConnections = response.filter((conn) => {
		if (isXrayResponse(conn.proto)) {
			return conn.proto.Xray === "VlessGrpc";
		}
		return false;
	});

	if (vlessGrpcConnections.length > 0) {
		console.log("VLESS GRPC conn", vlessGrpcConnections[0]);

		return vlessGrpcConnections[0];
	}

	return await createConnection();
}

export function mapInboundToVless(inbound: Inbound): ProtoResponse["Vless"] {
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
