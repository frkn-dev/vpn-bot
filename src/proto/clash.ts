import { ClashConfig, ClashProxy } from "../types/clash";

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
