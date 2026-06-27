# Ultraner MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents call the [Ultraner](https://ultraner.com) API directly: create payments and refunds, open checkout sessions, manage escrow, and inspect transactions across Africa.

- Docs: https://ultraner.com/docs
- OpenAPI: https://ultraner.com/openapi.json
- For AI: https://ultraner.com/ai

## Run

```bash
ULTRANER_API_KEY=sk_live_... npx @ultraner/mcp
```

## Use in an MCP client

Claude Desktop / Claude Code (`mcp.json` or settings):

```json
{
  "mcpServers": {
    "ultraner": {
      "command": "npx",
      "args": ["-y", "@ultraner/mcp"],
      "env": { "ULTRANER_API_KEY": "sk_live_..." }
    }
  }
}
```

## Tools

- `create_mobile_money_payment` charge a mobile-money wallet
- `get_payment_status` look up a payment by reference
- `create_disbursement` send a payout
- `get_wallet` wallet balances
- `list_transactions` recent transactions
- `create_escrow` / `release_escrow` hold and release funds
- `create_paypal_order` / `create_stripe_session` international payers

## Environment

- `ULTRANER_API_KEY` (required) your secret API key
- `ULTRANER_BASE_URL` (optional) defaults to `https://api.ultraner.com`

## License

MIT
