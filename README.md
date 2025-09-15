# FRKN VPN Telegram Bot

This bot allows users to create and retrieve VPN configurations (VlessGrpc, VlessXtls, Vmess, Wireguard, etc.) via interactive commands and inline buttons. It communicates with a backend [API server](https://github.com/frkn-dev/pony) that manages users, nodes, and connections.

## Dev-mode

```sh
cp .env.example .env
docker-compose up -d
prisma db push

npm run dev
ngrok http 3000
```

### Requirements

[Node.js LTS](https://nodejs.org) and [pnpm](https://pnpm.io/installation#using-npm). IDE with [TypeScript](https://code.visualstudio.com/docs/languages/typescript) and [Biome](https://biomejs.dev/guides/integrate-in-editor/) support.
