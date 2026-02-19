<!-- AdminPanel.vue — Sentinel Operations Center -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { http } from '@/api/http'

defineOptions({ name: 'AdminPanel' })

// ─── Types ───────────────────────────────────────────────────────────────────
interface Integration {
  id: number
  partner_name: string
  webhook_url: string
  is_active: boolean
  notify_on: string[]
  created_at: string
  last_used_at: string | null
  api_key?: string
}

interface AuditEntry {
  id: number
  transaction_id: string
  analyst_id: string | null
  action: string
  previous_decision: string | null
  new_decision: string | null
  note: string | null
  created_at: string
}

// ─── State ───────────────────────────────────────────────────────────────────
type Tab = 'integrations' | 'review' | 'audit' | 'users'
const activeTab = ref<Tab>('integrations')

// ── Integrations ─────────────────────────────────────────────────────────────
const integrations     = ref<Integration[]>([])
const intLoading       = ref(false)
const newIntForm       = ref({ partner_name: '', webhook_url: '', notify_on: ['BLOCK', 'REVIEW'] })
const creatingInt      = ref(false)
const newlyCreatedKey  = ref<string | null>(null)
const intError         = ref<string | null>(null)
const showCreateForm   = ref(false)
const togglingId       = ref<number | null>(null)
const deletingId       = ref<number | null>(null)

// ── Case Review ───────────────────────────────────────────────────────────────
const reviewTxnId      = ref('')
const reviewForm       = ref({ analyst_id: '', action: 'CONFIRM_FRAUD', new_decision: '', note: '' })
const reviewing        = ref(false)
const reviewResult     = ref<any>(null)
const reviewError      = ref<string | null>(null)

// ── Audit Log ────────────────────────────────────────────────────────────────
const auditLog         = ref<AuditEntry[]>([])
const auditLoading     = ref(false)
const auditFilter      = ref({ transaction_id: '', analyst_id: '', limit: 50, offset: 0 })
const auditError       = ref<string | null>(null)
const auditTotal       = ref(0)

// ── User Risk ─────────────────────────────────────────────────────────────────
const userRiskId       = ref('')
const userRiskForm     = ref({ risk_tier: 'elevated', is_flagged: false, notes: '' })
const updatingRisk     = ref(false)
const userRiskResult   = ref<any>(null)
const userRiskError    = ref<string | null>(null)

// ─── Integrations API ────────────────────────────────────────────────────────
const loadIntegrations = async () => {
  intLoading.value = true
  try {
    const r = await http.get('/admin/integrations')
    integrations.value = r.data
  } catch (e: any) {
    intError.value = e?.response?.data?.detail ?? 'Failed to load integrations.'
  } finally { intLoading.value = false }
}

const createIntegration = async () => {
  if (!newIntForm.value.partner_name.trim() || !newIntForm.value.webhook_url.trim()) return
  creatingInt.value    = true
  newlyCreatedKey.value = null
  intError.value        = null
  try {
    const r = await http.post('/admin/integrations', newIntForm.value)
    newlyCreatedKey.value = r.data.api_key
    newIntForm.value = { partner_name: '', webhook_url: '', notify_on: ['BLOCK', 'REVIEW'] }
    showCreateForm.value = false
    await loadIntegrations()
  } catch (e: any) {
    intError.value = e?.response?.data?.detail ?? 'Failed to create integration.'
  } finally { creatingInt.value = false }
}

const toggleIntegration = async (id: number) => {
  togglingId.value = id
  try {
    await http.patch(`/admin/integrations/${id}/toggle`)
    await loadIntegrations()
  } catch { /* ignore */ }
  finally { togglingId.value = null }
}

const deleteIntegration = async (id: number) => {
  if (!confirm('Remove this integration? Webhook delivery will stop immediately.')) return
  deletingId.value = id
  try {
    await http.delete(`/admin/integrations/${id}`)
    await loadIntegrations()
  } catch { /* ignore */ }
  finally { deletingId.value = null }
}

const toggleNotify = (decision: string) => {
  const idx = newIntForm.value.notify_on.indexOf(decision)
  if (idx > -1) newIntForm.value.notify_on.splice(idx, 1)
  else newIntForm.value.notify_on.push(decision)
}

// ─── Case Review API ─────────────────────────────────────────────────────────
const submitReview = async () => {
  if (!reviewTxnId.value.trim() || !reviewForm.value.analyst_id.trim()) return
  reviewing.value    = true
  reviewError.value  = null
  reviewResult.value = null
  try {
    const payload: any = {
      analyst_id: reviewForm.value.analyst_id,
      action: reviewForm.value.action,
      note: reviewForm.value.note || null,
    }
    if (reviewForm.value.new_decision) payload.new_decision = reviewForm.value.new_decision
    const r = await http.post(`/admin/review/${reviewTxnId.value.trim()}`, payload)
    reviewResult.value = r.data
    await loadAuditLog()
  } catch (e: any) {
    reviewError.value = e?.response?.data?.detail ?? 'Review submission failed.'
  } finally { reviewing.value = false }
}

// ─── Audit Log API ───────────────────────────────────────────────────────────
const loadAuditLog = async () => {
  auditLoading.value = true
  auditError.value   = null
  try {
    const params: any = { limit: auditFilter.value.limit, offset: auditFilter.value.offset }
    if (auditFilter.value.transaction_id) params.transaction_id = auditFilter.value.transaction_id
    if (auditFilter.value.analyst_id)     params.analyst_id     = auditFilter.value.analyst_id
    const r = await http.get('/admin/audit_log', { params })
    auditLog.value   = r.data
    auditTotal.value = r.data.length
  } catch (e: any) {
    auditError.value = e?.response?.data?.detail ?? 'Failed to load audit log.'
  } finally { auditLoading.value = false }
}

const auditPage = (dir: 1 | -1) => {
  auditFilter.value.offset = Math.max(0, auditFilter.value.offset + dir * auditFilter.value.limit)
  loadAuditLog()
}

// ─── User Risk API ────────────────────────────────────────────────────────────
const updateUserRisk = async () => {
  if (!userRiskId.value.trim()) return
  updatingRisk.value    = true
  userRiskError.value   = null
  userRiskResult.value  = null
  try {
    const r = await http.patch(`/admin/users/${userRiskId.value.trim()}/risk`, {
      risk_tier:  userRiskForm.value.risk_tier,
      is_flagged: userRiskForm.value.is_flagged,
      notes:      userRiskForm.value.notes || null,
    })
    userRiskResult.value = r.data
  } catch (e: any) {
    userRiskError.value = e?.response?.data?.detail ?? 'Update failed.'
  } finally { updatingRisk.value = false }
}

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }) : '—'

const decisionColor = (d?: string | null) => ({
  BLOCK:  '#ff4444',
  REVIEW: '#f59e0b',
  ALLOW:  '#10b981',
})[d ?? ''] ?? '#5a6478'

const actionColor = (a: string) => ({
  CONFIRM_FRAUD: '#ff4444',
  CLEAR:         '#10b981',
  ESCALATE:      '#f59e0b',
  NOTE:          '#6366f1',
})[a] ?? '#5a6478'

const tierColor = (t?: string) => ({
  high:     '#ff4444',
  elevated: '#f59e0b',
  standard: '#10b981',
})[t ?? ''] ?? '#5a6478'

onMounted(() => {
  loadIntegrations()
  loadAuditLog()
})
</script>

<template>
  <div class="shell">
    <div class="grain" aria-hidden="true"/>
    <div class="glow-orb glow-1" aria-hidden="true"/>
    <div class="glow-orb glow-2" aria-hidden="true"/>

    <!-- Topbar -->
    <div class="topbar">
      <div class="logo-mark">S</div>
      <span class="brand-name">SENTINEL</span>
      <span class="brand-sep">/</span>
      <span class="brand-section">Operations Center</span>
      <div class="topbar-badge">ADMIN</div>
    </div>

    <div class="main-wrap">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <header class="page-header">
        <div class="eyebrow"><span class="pulse-dot"/>ADMIN · OPERATIONS CENTER</div>
        <h1 class="page-title">Control Panel</h1>
        <p class="page-desc">
          Manage bank partner integrations, review flagged cases, inspect the
          immutable audit trail, and update user risk classifications.
        </p>
      </header>

      <!-- ── Tab nav ────────────────────────────────────────────────────── -->
      <nav class="tab-bar">
        <button v-for="(tab, i) in [
          { id:'integrations', icon:'◈', label:'Partner Integrations' },
          { id:'review',       icon:'◎', label:'Case Review' },
          { id:'audit',        icon:'▲', label:'Audit Log' },
          { id:'users',        icon:'◉', label:'User Risk' },
        ]" :key="tab.id"
                @click="activeTab = tab.id as Tab"
                :class="['tab', activeTab === tab.id && 'active']"
                :style="`animation-delay:${i * 0.06}s`"
        >
          <span class="tab-glyph">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </nav>

      <!-- ════════════════════════════════════════════════════════════════ -->
      <!-- INTEGRATIONS                                                      -->
      <!-- ════════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'integrations'" class="tab-body">

        <!-- One-time API key reveal -->
        <div v-if="newlyCreatedKey" class="api-key-reveal">
          <div class="akr-header">
            <span class="akr-title">⚡ Integration Created — Save This API Key</span>
            <button @click="newlyCreatedKey = null" class="akr-dismiss">✕</button>
          </div>
          <p class="akr-warn">This key is shown <strong>once only</strong> and never stored in plaintext. Copy it now.</p>
          <div class="akr-key-row">
            <code class="akr-key">{{ newlyCreatedKey }}</code>
            <button class="akr-copy" @click="navigator.clipboard?.writeText(newlyCreatedKey!)">Copy</button>
          </div>
        </div>

        <!-- Header + create button -->
        <div class="section-hd">
          <div>
            <div class="section-title">Registered Partners</div>
            <div class="section-sub">{{ integrations.length }} webhook integrations</div>
          </div>
          <button @click="showCreateForm = !showCreateForm" class="primary-btn">
            {{ showCreateForm ? '✕ Cancel' : '+ New Integration' }}
          </button>
        </div>

        <!-- Create form -->
        <div v-if="showCreateForm" class="form-card">
          <div class="fc-title">Register Partner Webhook</div>
          <div class="form-grid">
            <div class="form-field">
              <label class="field-label">PARTNER NAME</label>
              <input v-model="newIntForm.partner_name" placeholder="e.g. FirstBank Nigeria" class="field-input"/>
            </div>
            <div class="form-field">
              <label class="field-label">WEBHOOK URL</label>
              <input v-model="newIntForm.webhook_url" placeholder="https://partner.bank/webhooks/sentinel" class="field-input"/>
            </div>
          </div>
          <div class="form-field">
            <label class="field-label">NOTIFY ON</label>
            <div class="notify-chips">
              <button
                v-for="d in ['ALLOW','REVIEW','BLOCK']" :key="d"
                @click="toggleNotify(d)"
                class="notify-chip"
                :class="{ active: newIntForm.notify_on.includes(d) }"
                :style="newIntForm.notify_on.includes(d) ? `--chip-c:${decisionColor(d)}` : ''"
              >{{ d }}</button>
            </div>
          </div>
          <div v-if="intError" class="inline-error">⚠ {{ intError }}</div>
          <button @click="createIntegration" :disabled="creatingInt || !newIntForm.partner_name || !newIntForm.webhook_url" class="primary-btn">
            <span v-if="!creatingInt">Create Integration</span>
            <span v-else class="btn-loading"><span class="btn-spinner"/>Creating…</span>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="intLoading && !integrations.length" class="skeleton-rows">
          <div v-for="i in 3" :key="i" class="skeleton-row"/>
        </div>

        <!-- Empty state -->
        <div v-else-if="!integrations.length && !intLoading" class="empty-state">
          <div class="es-icon">◈</div>
          <p>No integrations registered yet.</p>
          <p class="es-sub">Click "New Integration" to connect a bank or fintech partner.</p>
        </div>

        <!-- Integration cards -->
        <div class="int-grid">
          <div v-for="int in integrations" :key="int.id" class="int-card" :class="{ inactive: !int.is_active }">
            <div class="ic-header">
              <div class="ic-name-row">
                <div class="ic-avatar" :class="int.is_active ? 'active-av' : 'inactive-av'">
                  {{ int.partner_name.slice(0,2).toUpperCase() }}
                </div>
                <div>
                  <div class="ic-name">{{ int.partner_name }}</div>
                  <div class="ic-url">{{ int.webhook_url }}</div>
                </div>
              </div>
              <div class="ic-actions">
                <button
                  @click="toggleIntegration(int.id)"
                  :disabled="togglingId === int.id"
                  :class="['toggle-btn', int.is_active ? 'toggle-active' : 'toggle-inactive']"
                >
                  {{ togglingId === int.id ? '…' : int.is_active ? 'Disable' : 'Enable' }}
                </button>
                <button @click="deleteIntegration(int.id)" :disabled="deletingId === int.id" class="delete-btn">
                  {{ deletingId === int.id ? '…' : '✕' }}
                </button>
              </div>
            </div>

            <div class="ic-meta">
              <div class="ic-meta-row">
                <span class="ic-meta-label">NOTIFY ON</span>
                <div class="ic-chips">
                  <span
                    v-for="d in int.notify_on" :key="d"
                    class="dec-chip"
                    :style="{ color: decisionColor(d), borderColor: decisionColor(d)+'40', background: decisionColor(d)+'10' }"
                  >{{ d }}</span>
                </div>
              </div>
              <div class="ic-meta-row">
                <span class="ic-meta-label">STATUS</span>
                <span :class="['status-badge', int.is_active ? 'status-active' : 'status-inactive']">
                  {{ int.is_active ? '● ACTIVE' : '○ INACTIVE' }}
                </span>
              </div>
              <div class="ic-meta-row">
                <span class="ic-meta-label">CREATED</span>
                <span class="ic-meta-val">{{ fmtDate(int.created_at) }}</span>
              </div>
              <div class="ic-meta-row">
                <span class="ic-meta-label">LAST USED</span>
                <span class="ic-meta-val">{{ fmtDate(int.last_used_at) }}</span>
              </div>
              <div class="ic-meta-row">
                <span class="ic-meta-label">ID</span>
                <span class="ic-meta-val mono">#{{ int.id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════ -->
      <!-- CASE REVIEW                                                       -->
      <!-- ════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'review'" class="tab-body">
        <div class="two-col">
          <div class="main-col">
            <div class="section-title">Analyst Case Review</div>
            <p class="section-sub">
              Override or confirm machine decisions. Every action is written
              immutably to the audit log for compliance and dispute resolution.
            </p>

            <div class="form-card">
              <div class="form-grid">
                <div class="form-field">
                  <label class="field-label">TRANSACTION ID</label>
                  <input v-model="reviewTxnId" placeholder="txn_00001" class="field-input mono"/>
                </div>
                <div class="form-field">
                  <label class="field-label">ANALYST ID</label>
                  <input v-model="reviewForm.analyst_id" placeholder="analyst_01 or your email" class="field-input mono"/>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <label class="field-label">ACTION</label>
                  <select v-model="reviewForm.action" class="field-select">
                    <option value="CONFIRM_FRAUD">CONFIRM_FRAUD — Mark as confirmed fraud</option>
                    <option value="CLEAR">CLEAR — Remove fraud flag, mark as legitimate</option>
                    <option value="ESCALATE">ESCALATE — Escalate to senior review</option>
                    <option value="NOTE">NOTE — Add context, no decision change</option>
                  </select>
                </div>
                <div class="form-field">
                  <label class="field-label">OVERRIDE DECISION <span class="optional">(optional)</span></label>
                  <select v-model="reviewForm.new_decision" class="field-select">
                    <option value="">— Keep current —</option>
                    <option value="ALLOW">ALLOW</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="BLOCK">BLOCK</option>
                  </select>
                </div>
              </div>

              <div class="form-field">
                <label class="field-label">NOTE <span class="optional">(optional)</span></label>
                <textarea v-model="reviewForm.note" rows="3" placeholder="Add context, rationale, or evidence…" class="field-textarea"/>
              </div>

              <div v-if="reviewError" class="inline-error">⚠ {{ reviewError }}</div>

              <button
                @click="submitReview"
                :disabled="reviewing || !reviewTxnId.trim() || !reviewForm.analyst_id.trim()"
                class="primary-btn"
              >
                <span v-if="!reviewing">Submit Review</span>
                <span v-else class="btn-loading"><span class="btn-spinner"/>Submitting…</span>
              </button>
            </div>

            <!-- Result -->
            <div v-if="reviewResult" class="result-card success-card">
              <div class="rc-header">
                <span class="rc-status success">✓ REVIEW RECORDED</span>
                <span class="action-badge" :style="{ color: actionColor(reviewResult.action), borderColor: actionColor(reviewResult.action)+'40', background: actionColor(reviewResult.action)+'12' }">
                  {{ reviewResult.action }}
                </span>
              </div>
              <div class="rc-grid">
                <div class="rcg-item"><span class="rcg-lbl">Transaction</span><span class="rcg-val mono">{{ reviewResult.transaction_id }}</span></div>
                <div class="rcg-item"><span class="rcg-lbl">Previous</span>
                  <span class="rcg-val" :style="{ color: decisionColor(reviewResult.previous_decision) }">{{ reviewResult.previous_decision }}</span>
                </div>
                <div class="rcg-item"><span class="rcg-lbl">New Decision</span>
                  <span class="rcg-val" :style="{ color: decisionColor(reviewResult.new_decision) }">{{ reviewResult.new_decision }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Side: Action reference -->
          <div class="side-col">
            <div class="info-panel">
              <div class="ip-title">Action Reference</div>
              <ul class="action-ref">
                <li v-for="a in [
                  { action: 'CONFIRM_FRAUD', color: '#ff4444', desc: 'Validates the machine\'s BLOCK decision. Signals the model was correct for training.' },
                  { action: 'CLEAR',         color: '#10b981', desc: 'Overrides a false positive. Transaction is marked as legitimate, decision updated.' },
                  { action: 'ESCALATE',      color: '#f59e0b', desc: 'Sends to senior analyst queue. No decision change, but flags for deeper review.' },
                  { action: 'NOTE',          color: '#6366f1', desc: 'Adds context or evidence without changing the fraud decision.' },
                ]" :key="a.action" class="ar-item">
                  <span class="ar-action" :style="{ color: a.color, borderColor: a.color+'40', background: a.color+'10' }">{{ a.action }}</span>
                  <span class="ar-desc">{{ a.desc }}</span>
                </li>
              </ul>
            </div>
            <div class="info-panel warn-panel">
              <div class="ip-title">⚠ Compliance Note</div>
              <p class="ip-desc">All review actions are appended to an <strong>immutable</strong> audit log. They cannot be deleted or edited — only subsequent actions can supersede them. This is required for PCI-DSS and SOX compliance.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════ -->
      <!-- AUDIT LOG                                                         -->
      <!-- ════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'audit'" class="tab-body">

        <!-- Filters -->
        <div class="filter-bar">
          <div class="form-field" style="flex:1;min-width:160px">
            <label class="field-label">TRANSACTION ID</label>
            <input v-model="auditFilter.transaction_id" placeholder="txn_00001" class="field-input mono" @keydown.enter="loadAuditLog"/>
          </div>
          <div class="form-field" style="flex:1;min-width:160px">
            <label class="field-label">ANALYST ID</label>
            <input v-model="auditFilter.analyst_id" placeholder="analyst_01" class="field-input mono" @keydown.enter="loadAuditLog"/>
          </div>
          <div class="form-field narrow">
            <label class="field-label">LIMIT</label>
            <select v-model.number="auditFilter.limit" class="field-select">
              <option v-for="n in [20,50,100,200]" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <button @click="loadAuditLog" :disabled="auditLoading" class="search-btn">
            <span v-if="!auditLoading">⌕ Filter</span>
            <span v-else class="btn-loading"><span class="btn-spinner"/>Loading…</span>
          </button>
          <button @click="() => { auditFilter = { transaction_id:'', analyst_id:'', limit:50, offset:0 }; loadAuditLog() }" class="ghost-btn">✕ Clear</button>
        </div>

        <div v-if="auditError" class="inline-error">⚠ {{ auditError }}</div>

        <!-- Table -->
        <div class="panel overflow-x-auto">
          <div class="panel-hd">
            <div>
              <div class="section-title">Audit Log</div>
              <div class="section-sub">{{ auditLog.length }} entries shown · Immutable compliance record · Offset {{ auditFilter.offset }}</div>
            </div>
          </div>

          <div v-if="auditLoading" class="skeleton-rows">
            <div v-for="i in 5" :key="i" class="skeleton-row"/>
          </div>

          <div v-else-if="!auditLog.length" class="empty-state">
            <div class="es-icon">▲</div>
            <p>No audit entries found for the current filters.</p>
          </div>

          <div v-else class="table-wrap">
            <table class="dt">
              <thead>
              <tr>
                <th>#</th>
                <th>TRANSACTION</th>
                <th>ANALYST</th>
                <th>ACTION</th>
                <th>PREV</th>
                <th>NEW</th>
                <th>NOTE</th>
                <th>TIMESTAMP</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="entry in auditLog" :key="entry.id">
                <td class="mono muted">{{ entry.id }}</td>
                <td class="mono" style="color:#a5b4fc">{{ entry.transaction_id }}</td>
                <td class="mono muted">{{ entry.analyst_id ?? '—' }}</td>
                <td>
                    <span class="action-badge" :style="{ color: actionColor(entry.action), borderColor: actionColor(entry.action)+'40', background: actionColor(entry.action)+'12' }">
                      {{ entry.action }}
                    </span>
                </td>
                <td>
                    <span v-if="entry.previous_decision" class="dec-chip" :style="{ color: decisionColor(entry.previous_decision), borderColor: decisionColor(entry.previous_decision)+'40', background: decisionColor(entry.previous_decision)+'10' }">
                      {{ entry.previous_decision }}
                    </span>
                  <span v-else class="muted">—</span>
                </td>
                <td>
                    <span v-if="entry.new_decision" class="dec-chip" :style="{ color: decisionColor(entry.new_decision), borderColor: decisionColor(entry.new_decision)+'40', background: decisionColor(entry.new_decision)+'10' }">
                      {{ entry.new_decision }}
                    </span>
                  <span v-else class="muted">—</span>
                </td>
                <td class="note-cell muted">{{ entry.note ?? '—' }}</td>
                <td class="mono muted">{{ fmtDate(entry.created_at) }}</td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="pagination">
            <button @click="auditPage(-1)" :disabled="auditFilter.offset === 0" class="ghost-btn">← Prev</button>
            <span class="page-info mono">{{ auditFilter.offset + 1 }}–{{ auditFilter.offset + auditLog.length }}</span>
            <button @click="auditPage(1)" :disabled="auditLog.length < auditFilter.limit" class="ghost-btn">Next →</button>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════ -->
      <!-- USER RISK                                                         -->
      <!-- ════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'users'" class="tab-body">
        <div class="two-col">
          <div class="main-col">
            <div class="section-title">User Risk Classification</div>
            <p class="section-sub">
              Update a user's risk tier. This directly affects their base fraud score
              on every future transaction — high-tier users start at +0.30 before signals are evaluated.
            </p>

            <div class="form-card">
              <div class="form-field">
                <label class="field-label">USER ID</label>
                <input v-model="userRiskId" placeholder="user_0042" class="field-input mono"/>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <label class="field-label">RISK TIER</label>
                  <div class="tier-selector">
                    <button
                      v-for="t in ['standard','elevated','high']" :key="t"
                      @click="userRiskForm.risk_tier = t"
                      class="tier-btn"
                      :class="{ active: userRiskForm.risk_tier === t }"
                      :style="userRiskForm.risk_tier === t ? { background: tierColor(t)+'18', color: tierColor(t), borderColor: tierColor(t)+'50' } : {}"
                    >
                      <span class="tier-dot" :style="{ background: tierColor(t) }"/>
                      {{ t.toUpperCase() }}
                      <span class="tier-score">+{{ t==='standard'?'5':t==='elevated'?'15':'30' }}%</span>
                    </button>
                  </div>
                </div>
                <div class="form-field">
                  <label class="field-label">FLAGS</label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="userRiskForm.is_flagged" class="checkbox-input"/>
                    <span class="checkbox-custom" :class="{ checked: userRiskForm.is_flagged }"/>
                    <span>Mark user as flagged <span class="flag-desc">(overrides tier → treated as HIGH)</span></span>
                  </label>
                </div>
              </div>

              <div class="form-field">
                <label class="field-label">ANALYST NOTES <span class="optional">(optional)</span></label>
                <textarea v-model="userRiskForm.notes" rows="2" placeholder="Reason for reclassification, evidence, ticket reference…" class="field-textarea"/>
              </div>

              <div v-if="userRiskError" class="inline-error">⚠ {{ userRiskError }}</div>

              <button @click="updateUserRisk" :disabled="updatingRisk || !userRiskId.trim()" class="primary-btn">
                <span v-if="!updatingRisk">Update Risk Classification</span>
                <span v-else class="btn-loading"><span class="btn-spinner"/>Updating…</span>
              </button>
            </div>

            <!-- Result -->
            <div v-if="userRiskResult" class="result-card success-card">
              <div class="rc-header">
                <span class="rc-status success">✓ CLASSIFICATION UPDATED</span>
              </div>
              <div class="rc-grid">
                <div class="rcg-item"><span class="rcg-lbl">User ID</span><span class="rcg-val mono">{{ userRiskResult.user_id }}</span></div>
                <div class="rcg-item">
                  <span class="rcg-lbl">Risk Tier</span>
                  <span class="rcg-val" :style="{ color: tierColor(userRiskResult.risk_tier) }">{{ userRiskResult.risk_tier?.toUpperCase() }}</span>
                </div>
                <div class="rcg-item">
                  <span class="rcg-lbl">Flagged</span>
                  <span :class="['rcg-val', userRiskResult.is_flagged ? 'danger-text' : 'success-text']">
                    {{ userRiskResult.is_flagged ? '⚑ YES' : '✓ NO' }}
                  </span>
                </div>
                <div v-if="userRiskResult.notes" class="rcg-item full-width">
                  <span class="rcg-lbl">Notes</span><span class="rcg-val">{{ userRiskResult.notes }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="side-col">
            <div class="info-panel">
              <div class="ip-title">Risk Tier Impact</div>
              <div class="tier-impact-list">
                <div v-for="t in [
                  { tier:'standard', label:'STANDARD', score:'0.05', desc:'Default tier. Normal spending patterns. Minimal base risk.' },
                  { tier:'elevated', label:'ELEVATED',  score:'0.15', desc:'Prior suspicious activity. Increased scrutiny on all transactions.' },
                  { tier:'high',     label:'HIGH',      score:'0.30', desc:'Confirmed history of fraud or policy violations. Near-automatic review.' },
                ]" :key="t.tier" class="ti-row" :style="{ '--tc': tierColor(t.tier) }">
                  <div class="ti-header">
                    <span class="ti-badge" :style="{ color: tierColor(t.tier), borderColor: tierColor(t.tier)+'40', background: tierColor(t.tier)+'12' }">
                      {{ t.label }}
                    </span>
                    <span class="ti-score" :style="{ color: tierColor(t.tier) }">Base +{{ t.score }}</span>
                  </div>
                  <p class="ti-desc">{{ t.desc }}</p>
                </div>
              </div>
            </div>
            <div class="info-panel">
              <div class="ip-title">Flagged User Behaviour</div>
              <p class="ip-desc">
                When <code>is_flagged = true</code>, the fraud detector always applies the
                <strong>HIGH</strong> base score of <code>+0.30</code> regardless of the assigned tier.
                Use this for users under active investigation without permanently upgrading their tier.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /main-wrap -->

    <!-- Footer -->
    <footer class="site-footer">
      <div class="footer-inner">
        <span class="ft-copy">© 2026</span>
        <a href="https://nobleson.info" target="_blank" rel="noopener" class="ft-link">Noble Eselase Vulley</a>
        <span class="ft-sep">·</span>
        <a href="https://africodelab.net" target="_blank" rel="noopener" class="ft-link">AfricodeLab</a>
        <span class="ft-sep">·</span>
        <span class="ft-stack">FastAPI · PostgreSQL · LangChain · FAISS · Tavily · Vue 3 · TypeScript</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Archivo:wght@400;500;600;700;800;900&display=swap');

.shell {
  --bg:      #040507;
  --card:    #0b0e13;
  --border:  rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.10);
  --text:    #dde3ed;
  --muted:   #5a6478;
  --dimmed:  #8896ab;
  --danger:  #ff4444;
  --warn:    #f59e0b;
  --success: #10b981;
  --accent:  #6366f1;
  --ff-sans: 'Archivo', system-ui, sans-serif;
  --ff-mono: 'DM Mono', monospace;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--ff-sans);
  position: relative;
  overflow-x: hidden;
}

/* Atmosphere */
.grain {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 256px; opacity: .5;
}
.glow-orb { position: fixed; pointer-events: none; border-radius: 50%; z-index: 0; }
.glow-1 { width: 600px; height: 600px; top: -150px; right: 0; background: radial-gradient(circle, rgba(99,102,241,.06) 0%, transparent 65%); }
.glow-2 { width: 500px; height: 500px; bottom: 0; left: -100px; background: radial-gradient(circle, rgba(255,68,68,.04) 0%, transparent 65%); }

/* Topbar */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 24px;
  background: rgba(4,5,7,.9); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
}
.logo-mark { width: 22px; height: 22px; border-radius: 4px; background: var(--accent); color: #fff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; font-family: var(--ff-mono); }
.brand-name    { font-size: 11px; font-weight: 800; letter-spacing: .18em; }
.brand-sep     { color: var(--muted); }
.brand-section { font-size: 11px; color: var(--dimmed); font-family: var(--ff-mono); }
.topbar-badge  { margin-left: auto; font-size: 8px; font-weight: 700; letter-spacing: .2em; padding: 3px 8px; border-radius: 3px; border: 1px solid rgba(255,68,68,.3); background: rgba(255,68,68,.08); color: var(--danger); font-family: var(--ff-mono); }

/* Main */
.main-wrap { position: relative; z-index: 2; max-width: 1360px; margin: 0 auto; padding: 68px 28px 48px; }

/* Header */
.page-header { padding-top: 24px; margin-bottom: 28px; }
.eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: .2em; color: var(--accent); margin-bottom: 10px; font-family: var(--ff-mono); }
.pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); animation: pd 2s infinite; }
@keyframes pd { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
.page-title { font-size: clamp(2rem,4vw,3.2rem); font-weight: 900; letter-spacing: -.03em; background: linear-gradient(135deg,#fff 30%,#4b5563 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; }
.page-desc  { font-size: 12px; color: var(--muted); max-width: 600px; line-height: 1.7; font-family: var(--ff-mono); font-weight: 300; }

/* Tabs */
.tab-bar { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 28px; gap: 0; flex-wrap: wrap; }
.tab {
  display: flex; align-items: center; gap: 7px; padding: 11px 20px;
  background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px;
  cursor: pointer; font-family: var(--ff-sans); font-size: 11px; font-weight: 700;
  letter-spacing: .12em; color: var(--muted); transition: all .2s;
}
.tab:hover { color: var(--dimmed); }
.tab.active { color: var(--text); border-bottom-color: var(--accent); }
.tab-glyph  { font-size: 9px; opacity: .5; }
.tab-body   { display: flex; flex-direction: column; gap: 18px; }

/* Section headings */
.section-hd    { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.section-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.section-sub   { font-size: 11px; color: var(--muted); font-family: var(--ff-mono); }

/* API key reveal */
.api-key-reveal {
  background: rgba(16,185,129,.07); border: 1px solid rgba(16,185,129,.25);
  border-radius: 12px; padding: 18px 20px; animation: fadein .3s ease;
}
.akr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.akr-title  { font-size: 12px; font-weight: 700; color: var(--success); }
.akr-dismiss{ background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px; }
.akr-warn   { font-size: 11px; color: var(--dimmed); font-family: var(--ff-mono); margin-bottom: 12px; }
.akr-warn strong { color: var(--warn); }
.akr-key-row{ display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.akr-key { font-family: var(--ff-mono); font-size: 12px; background: rgba(0,0,0,.4); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); color: var(--success); word-break: break-all; flex: 1; }
.akr-copy{ padding: 9px 16px; border-radius: 8px; background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.3); color: var(--success); cursor: pointer; font-size: 11px; font-family: var(--ff-mono); transition: all .2s; white-space: nowrap; }
.akr-copy:hover { background: rgba(16,185,129,.25); }

/* Form */
.form-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
.fc-title   { font-size: 12px; font-weight: 700; letter-spacing: .08em; color: var(--dimmed); margin-bottom: 2px; }
.form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media(max-width:640px){ .form-grid { grid-template-columns: 1fr; } }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.field-label{ font-size: 8px; font-weight: 700; letter-spacing: .2em; color: var(--muted); font-family: var(--ff-mono); }
.optional   { font-weight: 400; opacity: .6; }
.field-input, .field-select, .field-textarea {
  padding: 10px 14px; border-radius: 9px; background: rgba(255,255,255,.04);
  border: 1px solid var(--border); color: var(--text); font-size: 13px;
  font-family: var(--ff-sans); outline: none; transition: border-color .2s;
}
.field-input:focus, .field-select:focus, .field-textarea:focus { border-color: var(--accent); }
.field-input::placeholder, .field-textarea::placeholder { color: var(--muted); }
.field-textarea { resize: vertical; }
.mono { font-family: var(--ff-mono); }
.field-select { cursor: pointer; }

/* Notify chips */
.notify-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.notify-chip {
  padding: 6px 14px; border-radius: 6px; border: 1px solid var(--border);
  background: rgba(255,255,255,.04); color: var(--muted); cursor: pointer;
  font-size: 10px; font-weight: 700; letter-spacing: .1em; font-family: var(--ff-mono); transition: all .2s;
}
.notify-chip.active { border-color: var(--chip-c, var(--accent)); color: var(--chip-c, var(--accent)); background: color-mix(in srgb, var(--chip-c, var(--accent)) 15%, transparent); }

/* Integration grid */
.int-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px,1fr)); gap: 14px; }
.int-card {
  background: var(--card); border: 1px solid var(--border); border-radius: 14px;
  padding: 20px 22px; transition: border-color .2s;
}
.int-card:hover { border-color: var(--border2); }
.int-card.inactive { opacity: .6; }
.ic-header  { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.ic-name-row{ display: flex; align-items: center; gap: 12px; min-width: 0; }
.ic-avatar  { width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: var(--ff-mono); }
.active-av  { background: rgba(99,102,241,.15); color: var(--accent); }
.inactive-av{ background: rgba(255,255,255,.05); color: var(--muted); }
.ic-name { font-size: 13px; font-weight: 700; }
.ic-url  { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
.ic-actions { display: flex; gap: 6px; flex-shrink: 0; }
.toggle-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid; cursor: pointer; font-size: 10px; font-weight: 700; letter-spacing: .08em; font-family: var(--ff-mono); transition: all .2s; }
.toggle-active  { border-color: rgba(255,68,68,.3);  color: var(--danger);  background: rgba(255,68,68,.08); }
.toggle-active:hover  { background: rgba(255,68,68,.15); }
.toggle-inactive{ border-color: rgba(16,185,129,.3); color: var(--success); background: rgba(16,185,129,.08); }
.toggle-inactive:hover{ background: rgba(16,185,129,.15); }
.delete-btn { padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); color: var(--muted); cursor: pointer; font-size: 12px; transition: all .2s; }
.delete-btn:hover { color: var(--danger); border-color: rgba(255,68,68,.3); background: rgba(255,68,68,.08); }
.ic-meta { display: flex; flex-direction: column; gap: 7px; padding-top: 14px; border-top: 1px solid var(--border); }
.ic-meta-row { display: flex; align-items: center; gap: 10px; }
.ic-meta-label { font-size: 8px; font-weight: 700; letter-spacing: .18em; color: var(--muted); font-family: var(--ff-mono); width: 70px; flex-shrink: 0; }
.ic-meta-val  { font-size: 11px; color: var(--dimmed); font-family: var(--ff-mono); }
.ic-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.dec-chip { font-size: 8px; font-weight: 700; letter-spacing: .1em; padding: 2px 7px; border-radius: 3px; border: 1px solid; font-family: var(--ff-mono); }
.status-badge  { font-size: 9px; font-weight: 700; letter-spacing: .12em; font-family: var(--ff-mono); }
.status-active { color: var(--success); }
.status-inactive { color: var(--muted); }

/* Primary button */
.primary-btn { padding: 12px 24px; border-radius: 9px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 12px; cursor: pointer; letter-spacing: .06em; font-family: var(--ff-sans); transition: all .25s; align-self: flex-start; }
.primary-btn:hover:not(:disabled) { background: #4f46e5; box-shadow: 0 0 28px rgba(99,102,241,.4); }
.primary-btn:disabled { opacity: .4; cursor: not-allowed; }
.search-btn { padding: 9px 18px; border-radius: 9px; border: 1px solid rgba(99,102,241,.35); background: rgba(99,102,241,.1); color: #a5b4fc; font-size: 11px; font-weight: 700; cursor: pointer; letter-spacing: .06em; transition: all .2s; white-space: nowrap; align-self: flex-end; }
.search-btn:hover:not(:disabled) { background: rgba(99,102,241,.2); }
.search-btn:disabled { opacity: .4; cursor: not-allowed; }
.ghost-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; font-family: var(--ff-mono); transition: all .2s; white-space: nowrap; align-self: flex-end; }
.ghost-btn:hover:not(:disabled) { color: var(--text); background: rgba(255,255,255,.05); }
.ghost-btn:disabled { opacity: .4; cursor: not-allowed; }

.btn-loading { display: flex; align-items: center; gap: 8px; }
.btn-spinner { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; animation: spin 1s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Result card */
.result-card { border-radius: 10px; border: 1px solid; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; animation: fadein .3s ease; }
.success-card{ border-color: rgba(16,185,129,.25); background: rgba(16,185,129,.05); }
.error-card  { border-color: rgba(255,68,68,.25);  background: rgba(255,68,68,.05); }
@keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.rc-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rc-status  { font-size: 10px; font-weight: 700; letter-spacing: .15em; font-family: var(--ff-mono); }
.rc-status.success { color: var(--success); }
.rc-status.danger  { color: var(--danger); }
.rc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media(max-width:640px){ .rc-grid { grid-template-columns: 1fr; } }
.rcg-item    { display: flex; flex-direction: column; gap: 3px; }
.rcg-lbl     { font-size: 8px; font-weight: 700; letter-spacing: .15em; color: var(--muted); font-family: var(--ff-mono); }
.rcg-val     { font-size: 13px; font-weight: 600; font-family: var(--ff-mono); }
.full-width  { grid-column: 1/-1; }
.danger-text { color: var(--danger); }
.success-text{ color: var(--success); }
.action-badge{ font-size: 9px; font-weight: 700; letter-spacing: .1em; padding: 3px 8px; border-radius: 3px; border: 1px solid; font-family: var(--ff-mono); }

/* Inline error */
.inline-error { font-size: 11px; color: var(--danger); font-family: var(--ff-mono); padding: 8px 12px; background: rgba(255,68,68,.07); border: 1px solid rgba(255,68,68,.2); border-radius: 7px; }

/* Layouts */
.two-col { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
.main-col { display: flex; flex-direction: column; gap: 14px; }
.side-col { display: flex; flex-direction: column; gap: 14px; }
@media(max-width:900px){ .two-col { grid-template-columns: 1fr; } }

/* Info panels */
.panel { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px 24px; }
.panel-hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.info-panel { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
.warn-panel { border-color: rgba(245,158,11,.2); background: rgba(245,158,11,.04); }
.ip-title   { font-size: 11px; font-weight: 700; letter-spacing: .08em; margin-bottom: 10px; }
.ip-desc    { font-size: 11px; color: var(--muted); font-family: var(--ff-mono); line-height: 1.6; margin: 0; }
.ip-desc code { background: rgba(255,255,255,.06); padding: 1px 5px; border-radius: 4px; font-size: 10px; }
.ip-desc strong { color: var(--dimmed); }

/* Action reference */
.action-ref { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.ar-item { display: flex; flex-direction: column; gap: 5px; }
.ar-action { font-size: 9px; font-weight: 700; letter-spacing: .1em; padding: 2px 8px; border-radius: 3px; border: 1px solid; display: inline-block; margin-bottom: 2px; font-family: var(--ff-mono); }
.ar-desc { font-size: 11px; color: var(--muted); font-family: var(--ff-mono); line-height: 1.5; }

/* Filter bar */
.filter-bar { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
.form-field.narrow { flex: 0 0 80px; }

/* Table */
.table-wrap { overflow-x: auto; }
.dt { width: 100%; border-collapse: collapse; font-size: 12px; }
.dt th { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--border); font-size: 8px; letter-spacing: .18em; font-weight: 700; color: var(--muted); white-space: nowrap; font-family: var(--ff-mono); }
.dt td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.03); white-space: nowrap; transition: background .15s; }
.dt tr:hover td { background: rgba(255,255,255,.025); }
.dt tr:last-child td { border-bottom: none; }
.dt .mono   { font-family: var(--ff-mono); }
.dt .muted  { color: var(--dimmed); }
.note-cell  { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--ff-mono); font-size: 11px; }
.overflow-x-auto { overflow-x: auto; }

/* Pagination */
.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; padding-top: 18px; border-top: 1px solid var(--border); margin-top: 12px; }
.page-info  { font-size: 11px; font-family: var(--ff-mono); color: var(--muted); }

/* Tier selector */
.tier-selector { display: flex; gap: 6px; flex-wrap: wrap; }
.tier-btn {
  display: flex; align-items: center; gap: 7px; padding: 9px 16px;
  border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,.04);
  color: var(--muted); cursor: pointer; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; font-family: var(--ff-mono); transition: all .2s;
}
.tier-dot   { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.tier-score { font-size: 8px; opacity: .6; margin-left: 2px; }
.tier-btn.active { box-shadow: 0 0 16px rgba(0,0,0,.3); }

/* Checkbox */
.checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 12px; color: var(--dimmed); user-select: none; }
.checkbox-input { display: none; }
.checkbox-custom {
  width: 16px; height: 16px; border-radius: 4px; border: 1px solid var(--border);
  background: rgba(255,255,255,.04); flex-shrink: 0; transition: all .2s;
  position: relative;
}
.checkbox-custom.checked { background: var(--danger); border-color: var(--danger); }
.checkbox-custom.checked::after { content: '✓'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #fff; }
.flag-desc { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); }

/* Tier impact list */
.tier-impact-list { display: flex; flex-direction: column; gap: 12px; }
.ti-row   { padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,.025); border-left: 2px solid var(--tc); }
.ti-header{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.ti-badge { font-size: 9px; font-weight: 700; letter-spacing: .12em; padding: 2px 7px; border-radius: 3px; border: 1px solid; font-family: var(--ff-mono); }
.ti-score { font-size: 11px; font-weight: 700; font-family: var(--ff-mono); }
.ti-desc  { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); line-height: 1.5; margin: 0; }

/* Skeleton */
.skeleton-rows { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
.skeleton-row  { height: 52px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.04) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Empty state */
.empty-state { text-align: center; padding: 56px 0; color: var(--muted); }
.es-icon { font-size: 2rem; margin-bottom: 12px; opacity: .4; }
.es-sub  { font-size: 11px; font-family: var(--ff-mono); margin-top: 4px; }

/* Footer */
.site-footer { position: relative; z-index: 2; border-top: 1px solid var(--border); padding: 24px; margin-top: 40px; }
.footer-inner { max-width: 1360px; margin: 0 auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
.ft-copy,.ft-stack { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); }
.ft-link  { font-size: 10px; color: var(--dimmed); text-decoration: none; transition: color .2s; font-family: var(--ff-mono); }
.ft-link:hover { color: var(--text); }
.ft-sep   { color: var(--muted); font-size: 10px; }
.ft-stack { opacity: .4; }
</style>
