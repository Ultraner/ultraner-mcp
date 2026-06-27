#!/usr/bin/env node
/**
 * Ultraner MCP server
 * Lets AI agents call the Ultraner API directly over the Model Context Protocol:
 * create payments and refunds, open checkout sessions, inspect transactions.
 *
 * Run:  ULTRANER_API_KEY=sk_live_... npx @ultraner/mcp
 * Docs: https://ultraner.com/ai
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_KEY = process.env.ULTRANER_API_KEY ?? '';
const BASE_URL = (process.env.ULTRANER_BASE_URL ?? 'https://api.ultraner.com').replace(/\/$/, '');

async function api(method: string, path: string, body?: unknown) {
  if (!API_KEY) {
    return { error: 'ULTRANER_API_KEY is not set. Export your Ultraner API key before starting the server.' };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) return { error: json.message ?? 'Request failed', code: json.code, status: res.status };
    return json.data ?? json;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: 'ultraner', version: '0.1.0' });

server.tool(
  'create_mobile_money_payment',
  'Charge an African mobile-money wallet (M-Pesa, Airtel, MTN, Mixx by Yas, etc.).',
  {
    amount: z.number().describe('Amount in the smallest currency unit'),
    currency: z.string().describe('e.g. TZS or RWF'),
    provider: z.string().describe('MNO operator code, e.g. Vodacom, Airtel, MTN'),
    accountNumber: z.string().describe('Payer phone in international format, e.g. 255700000000'),
    externalId: z.string().optional().describe('Your idempotent reference'),
  },
  async (args) => ok(await api('POST', '/v1/payments/express/mno', args)),
);

server.tool(
  'get_payment_status',
  'Get the status of a payment by its reference.',
  { reference: z.string() },
  async ({ reference }) => ok(await api('GET', `/v1/payments/express/status/${encodeURIComponent(reference)}`)),
);

server.tool(
  'create_disbursement',
  'Send money to a mobile wallet or bank account (payout).',
  {
    amount: z.number(),
    currency: z.string(),
    provider: z.string(),
    accountNumber: z.string(),
    externalId: z.string().optional(),
  },
  async (args) => ok(await api('POST', '/v1/disbursements', args)),
);

server.tool('get_wallet', 'Get Ultraner wallet balances.', {}, async () => ok(await api('GET', '/v1/wallet')));

server.tool(
  'list_transactions',
  'List recent transactions.',
  { page: z.number().optional(), limit: z.number().optional() },
  async ({ page, limit }) => {
    const q = new URLSearchParams();
    if (page) q.set('page', String(page));
    if (limit) q.set('limit', String(limit));
    const qs = q.toString();
    return ok(await api('GET', `/v1/transactions${qs ? `?${qs}` : ''}`));
  },
);

server.tool(
  'create_escrow',
  'Hold funds in escrow until released.',
  { amount: z.number(), currency: z.string(), recipient: z.string(), description: z.string().optional() },
  async (args) => ok(await api('POST', '/v1/escrow', args)),
);

server.tool(
  'release_escrow',
  'Release an escrow hold to the recipient.',
  { escrowCode: z.string() },
  async ({ escrowCode }) => ok(await api('POST', `/v1/escrow/${encodeURIComponent(escrowCode)}/release`)),
);

server.tool(
  'create_paypal_order',
  'Create a PayPal order for international payers.',
  { amount: z.number(), currency: z.string(), returnUrl: z.string().optional(), cancelUrl: z.string().optional() },
  async (args) => ok(await api('POST', '/paypal/orders', args)),
);

server.tool(
  'create_stripe_session',
  'Create a Stripe checkout session for card payments.',
  { amount: z.number(), currency: z.string(), successUrl: z.string().optional(), cancelUrl: z.string().optional() },
  async (args) => ok(await api('POST', '/stripe/sessions', args)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error('Ultraner MCP server running on stdio.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal:', err);
  process.exit(1);
});
