# VPN Telegram Bot

A Telegram bot for managing VPN connections, implemented in TypeScript.
Description

This bot allows users to create and retrieve VPN configurations (VlessGrpc, VlessXtls, Vmess, Wireguard, etc.) via interactive commands and inline buttons. It communicates with a backend API server that manages users, nodes, and connections.
Features, works with https://github.com/frkn-dev/pony

### Installation & Running

Clone the repository:

```git clone https://github.com/yourusername/vpn-telegram-bot.git
cd vpn-telegram-bot
```

Install dependencies:

`npm install`

Create a .env file with your environment variables:

```
API_BASE_URL=https://your-api-server.com/api
API_AUTH_TOKEN=your_api_token_here
BOT_TOKEN=your_telegram_bot_token_here

```

Start the bot:

    npm run start

## Bot Commands

    /start — Start interacting with the bot

    /connect — Select VPN protocol and server

    /sub — Get VPN subscription/configuration

    /stat — View traffic statistics

    /delete — Delete (deactivate) user

### License

GNU GENERAL PUBLIC LICENSE Version 3
