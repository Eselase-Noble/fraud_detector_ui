// Shared reference for partner onboarding — institution types and the ways an
// institution can feed transaction data to Sentinel. Used by the admin Partners
// view and the self-service Partner Portal so both speak the same language.
import type { InstitutionType, ConnectionMethod } from '@/api/admin'

export const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'bank',         label: 'Bank' },
  { value: 'fintech',      label: 'Fintech' },
  { value: 'psp',          label: 'Payment service provider' },
  { value: 'microfinance', label: 'Microfinance institution' },
  { value: 'mobile_money', label: 'Mobile money operator' },
  { value: 'sacco',        label: 'SACCO / credit union' },
  { value: 'exchange',     label: 'Exchange / crypto' },
  { value: 'other',        label: 'Other' },
]

export const institutionLabel = (v?: string) =>
  INSTITUTION_TYPES.find(t => t.value === v)?.label ?? v ?? '—'

export interface ConnectionMethodDef {
  value: ConnectionMethod
  label: string
  tagline: string
  description: string
  latency: string
  bestFor: string
  /** A ready-to-run sample tailored to the caller's endpoint + key. */
  sample: (baseUrl: string, apiKey: string) => { lang: string; code: string }
}

const KEY = (apiKey: string) => apiKey || '<YOUR_API_KEY>'

export const CONNECTION_METHODS: ConnectionMethodDef[] = [
  {
    value: 'rest_api',
    label: 'Real-time REST API',
    tagline: 'Score one transaction inline and get a decision back synchronously.',
    description:
      'Call the detect endpoint as each transaction is authorized. Sentinel returns a decision (ALLOW / REVIEW / BLOCK), a risk score and the signals behind it — in time to act before the transaction settles.',
    latency: 'Synchronous · ~1–5s per call',
    bestFor: 'Inline authorization, checkout, transfers',
    sample: (baseUrl, apiKey) => ({
      lang: 'bash',
      code: `curl -X POST ${baseUrl}/transactions/detect \\
  -H "X-API-Key: ${KEY(apiKey)}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transaction_id": "txn_1001",
    "user_id": "user_204",
    "amount": 25000,
    "currency": "GHS",
    "location": "Accra, GH",
    "merchant_category": "crypto",
    "ip_address": "102.89.44.10"
  }'

# → { "decision": "BLOCK", "score": 0.92, "reason": "...", "signals": [...] }`,
    }),
  },
  {
    value: 'batch_api',
    label: 'Batch API',
    tagline: 'Send many transactions in one request for bulk or periodic scoring.',
    description:
      'Post an array of transactions and receive a decision for each, plus batch totals. Ideal for hourly settlement runs or back-testing a portfolio without one call per row.',
    latency: 'Near-real-time · one request per batch',
    bestFor: 'Settlement runs, back-testing, reconciliation',
    sample: (baseUrl, apiKey) => ({
      lang: 'bash',
      code: `curl -X POST ${baseUrl}/transactions/batch_detect \\
  -H "X-API-Key: ${KEY(apiKey)}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactions": [
      { "transaction_id": "t1", "user_id": "u1", "amount": 120,   "currency": "GHS" },
      { "transaction_id": "t2", "user_id": "u2", "amount": 48000, "currency": "GHS" }
    ]
  }'

# → { "total": 2, "blocked": 1, "reviewed": 0, "allowed": 1, "results": [...] }`,
    }),
  },
  {
    value: 'database',
    label: 'Database connector',
    tagline: 'Point Sentinel at your transactions table; it syncs on a schedule.',
    description:
      'Provide read-only credentials and a cursor column. A scheduled connector pulls new rows, scores them, and writes decisions back (or emits webhooks). No application changes — your data stays in your database between syncs.',
    latency: 'Scheduled · configurable poll interval',
    bestFor: 'Core-banking DBs, warehouses, no code changes',
    sample: () => ({
      lang: 'yaml',
      code: `# sentinel-connector.yml — hand to your Sentinel onboarding contact
source:
  engine: postgres          # postgres | mysql | mssql | oracle
  host: db.yourbank.internal
  port: 5432
  database: core
  schema: public
  table: transactions
  # read-only role — Sentinel never writes to your source
  username: sentinel_ro
  password_ref: secret://sentinel/db   # stored in your vault, not here

sync:
  cursor_column: created_at   # monotonic column used to fetch new rows
  poll_interval: 60s
  batch_size: 500

# map your columns onto the Sentinel transaction schema
mapping:
  transaction_id: txn_ref
  user_id: customer_id
  amount: amount_minor        # divided by currency exponent
  currency: currency_code
  location: branch_city
  merchant_category: mcc
  ip_address: session_ip`,
    }),
  },
  {
    value: 'file_sftp',
    label: 'File / SFTP drop',
    tagline: 'Drop CSV files; Sentinel ingests and scores them automatically.',
    description:
      'Export transactions to CSV and drop them on your SFTP folder (or upload from the portal). Sentinel ingests each file, scores every row and returns a results file. Simple and firewall-friendly for daily reconciliation.',
    latency: 'Batch · per file drop',
    bestFor: 'Legacy systems, daily exports, air-gapped ops',
    sample: () => ({
      lang: 'csv',
      code: `# transactions_2026-08-28.csv  →  drop in /inbound on sftp.sentinel.africodelab
transaction_id,user_id,amount,currency,location,merchant_category,ip_address
txn_5001,user_88,340.00,GHS,Kumasi GH,retail,41.66.10.2
txn_5002,user_91,52000.00,GHS,Lagos NG,crypto,102.89.44.10

# Results land in /outbound/transactions_2026-08-28.results.csv
# with two extra columns appended: decision, score`,
    }),
  },
]

export const connectionMethod = (v?: string) =>
  CONNECTION_METHODS.find(m => m.value === v)
export const connectionLabel = (v?: string) => connectionMethod(v)?.label ?? v ?? '—'
