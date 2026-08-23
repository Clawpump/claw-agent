import { hermesApi, profileScoped } from './client'

export interface PodWallet {
  agent_id: string
  name?: string | null
  avatar_url?: string | null
  token_mint?: string | null
  wallet_address: string | null
  usdc_balance: number | null
  sol_balance?: number | null
  updated_at?: string
}

export interface WalletTransferInput {
  agent_id: string
  to: string
  amount: number
  token: 'SOL' | 'USDC'
  add_to_whitelist?: boolean
  label?: string
}

export function transferWallet(
  body: WalletTransferInput
): Promise<{ ok: boolean; error?: string; code?: string; result?: unknown }> {
  return hermesApi({ ...profileScoped(), path: '/api/wallet/transfer', method: 'POST', body })
}

export interface X402Pricing {
  network?: string
  asset?: string
  scheme?: string
  priceUsdc?: number | null
  priceLabel?: string
}

export interface X402Result {
  resourceUrl?: string
  name?: string
  description?: string
  category?: string
  method?: string
  host?: string
  match?: string
  qualityScore?: number | null
  verified?: boolean
  pricing?: X402Pricing[]
}

export function searchX402(
  query: string
): Promise<{ ok: boolean; error?: string; query?: string; results: X402Result[] }> {
  return hermesApi({ ...profileScoped(), path: `/api/x402/search?q=${encodeURIComponent(query)}` })
}

export interface MailInbox {
  id: string
  agentId: string
  provider: string
  inboxId: string
  emailAddress: string
  username: string
  domain: string
  webhookId: string | null
  verified: boolean
  status: string
  createdAt: string
  updatedAt: string
}

export interface MailMessage {
  id: string
  agentId: string
  inboxId: string
  messageId: string
  threadId: string | null
  direction: 'inbound' | 'outbound'
  fromAddress: string | null
  toAddresses: string[]
  ccAddresses: string[]
  subject: string | null
  textBody: string | null
  htmlBody: string | null
  preview: string | null
  read: boolean
  agentmailCreatedAt: string | null
  createdAt: string
}

export interface MailAddressResponse {
  ok: boolean
  error?: string
  has_inbox: boolean
  inbox: MailInbox | null
}

export interface MailMessagesResponse {
  ok: boolean
  error?: string
  messages: MailMessage[]
}

export interface MailMessageResponse {
  ok: boolean
  error?: string
  message: MailMessage | null
}

export interface MailCreateResponse {
  ok: boolean
  error?: string
  inbox?: MailInbox | null
  alreadyExisted?: boolean
  note?: string | null
}

export interface MailSendBody {
  agent_id: string
  to: string[]
  subject: string
  text?: string
  html?: string
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  confirm: boolean
}

export interface MailSendResponse {
  ok: boolean
  error?: string
  result?: unknown
}

export function getMailAddress(agentId: string): Promise<MailAddressResponse> {
  return hermesApi({ ...profileScoped(), path: `/api/mail/address?agent_id=${encodeURIComponent(agentId)}` })
}

export function listMail(opts: {
  agentId: string
  direction?: 'inbound' | 'outbound'
  limit?: number
}): Promise<MailMessagesResponse> {
  const qs = new URLSearchParams({ agent_id: opts.agentId })

  if (opts.direction) {
    qs.set('direction', opts.direction)
  }

  if (opts.limit) {
    qs.set('limit', String(opts.limit))
  }

  return hermesApi({ ...profileScoped(), path: `/api/mail/messages?${qs.toString()}` })
}

export function readMail(messageId: string, agentId: string): Promise<MailMessageResponse> {
  return hermesApi({
    ...profileScoped(),
    path: `/api/mail/message?message_id=${encodeURIComponent(messageId)}&agent_id=${encodeURIComponent(agentId)}`
  })
}

export function createInbox(body: { agent_id: string; username?: string; confirm: boolean }): Promise<MailCreateResponse> {
  return hermesApi({ ...profileScoped(), path: '/api/mail/create', method: 'POST', body, timeoutMs: 120_000 })
}

export function sendMail(body: MailSendBody): Promise<MailSendResponse> {
  return hermesApi({ ...profileScoped(), path: '/api/mail/send', method: 'POST', body, timeoutMs: 120_000 })
}

export function getPodStatus(): Promise<{ connected: boolean; balance_usdc?: number | null }> {
  return hermesApi({ ...profileScoped(), path: '/api/clawpump/pod/status' })
}

export interface McpServer {
  name: string
  transport: string
  url?: string | null
  command?: string | null
  auth?: string | null
  enabled: boolean
  authenticated?: boolean | null
  tools?: string[] | null
}

export function getMcpServers(): Promise<{ servers: McpServer[] }> {
  return hermesApi({ ...profileScoped(), path: '/api/mcp/servers' })
}

export function mcpLogin(name: string): Promise<{ ok: boolean; authenticated?: boolean; error?: string }> {
  return hermesApi({
    ...profileScoped(),
    path: `/api/mcp/${encodeURIComponent(name)}/login`,
    method: 'POST',
    timeoutMs: 200_000
  })
}

export function getPodWallets(): Promise<{ ok: boolean; wallets: PodWallet[]; error?: string }> {
  return hermesApi({ ...profileScoped(), path: '/api/wallet/balances' })
}

export function provisionPod(
  agentId: string,
  amount: number
): Promise<{ ok: boolean; model?: string; signature?: string; funding_error?: string; error?: string }> {
  return hermesApi({
    ...profileScoped(),
    path: '/api/clawpump/pod/provision',
    method: 'POST',
    body: { agent_id: agentId, amount },
    timeoutMs: 120_000
  })
}
