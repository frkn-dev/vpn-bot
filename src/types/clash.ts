// Clash config TypeScript version

export type ClashConfig = {
	port: number;
	mode: "global";
	proxies: ClashProxy[];
	"proxy-groups": ClashProxyGroup[];
	rules: string[];
};

export type ClashProxy = ClashVmessProxy | ClashVlessProxy;

export type ClashVmessProxy = {
	type: "Vmess";
	name: string;
	server: string;
	port: number;
	uuid: string;
	cipher: string;
	udp: boolean;
	alterId: number;
	network: string;
	"http-opts": HttpOpts;
};

export type ClashVlessProxy = {
	type: "Vless";
	name: string;
	server: string;
	port: number;
	uuid: string;
	udp: boolean;
	tls: boolean;
	network: string;
	servername: string;
	"reality-opts": RealityOpts;
	"grpc-opts"?: GrpcOpts;
	"client-fingerprint": string;
	flow?: string;
};

export type HttpOpts = {
	method: string;
	path: string[];
	headers: HttpHeaders;
	"ip-version": string;
	host: string;
};

export type HttpHeaders = {
	connection: string[];
};

export type RealityOpts = {
	"public-key": string;
	"short-id": string;
};

export type GrpcOpts = {
	"grpc-service-name": string;
	"ip-version": string;
};

export type ClashProxyGroup = {
	name: string;
	type: string;
	url: string;
	interval: number;
	proxies: string[];
};

export function generateProxyConfig(
	tag: string,
	port: number,
	stream: any,
	connId: string,
	address: string,
	label: string,
): ClashProxy | null {
	if (tag === "Vmess") {
		const tcp = stream.tcpSettings;
		const header = tcp?.header;
		const req = header?.request;
		const host = req?.headers?.Host?.[0];
		const path = req?.path?.[0] || "/";

		if (!host) return null;

		return {
			type: "Vmess",
			name: `${label} [${tag}]`,
			server: address,
			port,
			uuid: connId,
			cipher: "auto",
			udp: true,
			alterId: 0,
			network: "http",
			"http-opts": {
				method: "GET",
				path: [path],
				headers: { connection: ["keep-alive"] },
				"ip-version": "dual",
				host,
			},
		};
	} else if (tag === "VlessGrpc" || tag === "VlessXtls") {
		const reality = stream.realitySettings;
		if (!reality) return null;

		const network = stream.grpcSettings ? "grpc" : "tcp";
		const grpc_opts = stream.grpcSettings
			? {
					"grpc-service-name": stream.grpcSettings.serviceName,
					"ip-version": "dual",
				}
			: undefined;

		const flow = !grpc_opts ? "xtls-rprx-vision" : undefined;

		return {
			type: "Vless",
			name: `${label} [${tag}]`,
			server: address,
			port,
			uuid: connId,
			udp: true,
			tls: true,
			network,
			servername: reality.serverNames?.[0] || "",
			"client-fingerprint": "chrome",
			"reality-opts": {
				"public-key": reality.publicKey,
				"short-id": reality.shortIds?.[0] || "",
			},
			"grpc-opts": grpc_opts,
			flow,
		};
	}

	return null;
}

export function generateClashConfig(proxies: ClashProxy[]): ClashConfig {
	const proxyNames = proxies.map((p) => p.name);

	return {
		port: 7890,
		mode: "global",
		proxies,
		"proxy-groups": [
			{
				name: "♻️ Automatic",
				type: "url-test",
				url: "http://www.gstatic.com/generate_204",
				interval: 300,
				proxies: proxyNames,
			},
		],
		rules: [],
	};
}
