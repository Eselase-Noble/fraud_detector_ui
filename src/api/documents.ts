/**
 * documents.ts
 * ------------
 * API client for the /knowledge/* endpoints.
 * Mirrors every route in backend/app/routers/knowledge.py.
 */
import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  status:   'success' | 'error'
  filename: string
  saved_to: string
  size_mb:  number
  note:     string
}

export interface SearchResult {
  content: string
  source:  string | null
  score:   number | null
}

export interface KnowledgeStats {
  total_documents: number
  directories: {
    csv:      number
    pdf:      number
    txt:      number
    json:     number
    markdown: number
  }
}

export interface OnlineEnrichResult {
  status:            'success' | 'no_results'
  topic:             string
  documents_fetched?: number
  saved_to?:         string
  note?:             string
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a document (PDF, CSV, TXT, JSON, MD) to the knowledge base.
 * The backend saves the file to disk and triggers a vector store refresh.
 * Supports optional upload progress via onProgress callback.
 */
export const uploadDocument = async (
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> => {
  const form = new FormData()
  form.append('file', file)

  const res = await http.post<UploadResult>('/knowledge/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => {
        if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      : undefined,
  })
  return res.data
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** Semantic search over the FAISS vector store. */
export const searchKnowledgeBase = async (
  query: string,
  k = 5,
): Promise<SearchResult[]> => {
  const res = await http.post<SearchResult[]>('/knowledge/search', { query, k })
  return res.data
}

// ─── Vector store management ──────────────────────────────────────────────────

/** Reload the vector store from disk (non-destructive, fast). */
export const reloadVectorStore = async (): Promise<{ status: string }> => {
  const res = await http.post<{ status: string }>('/knowledge/reload')
  return res.data
}

/** Full rebuild of the vector store from all documents (slow). */
export const rebuildVectorStore = async (): Promise<{ status: string }> => {
  const res = await http.post<{ status: string }>('/knowledge/rebuild')
  return res.data
}

// ─── Online enrichment ────────────────────────────────────────────────────────

/**
 * Fetch live fraud intelligence from the web via Tavily and
 * add it to the knowledge base.
 */
export const enrichFromWeb = async (
  topic: string,
  maxResults = 5,
): Promise<OnlineEnrichResult> => {
  const res = await http.post<OnlineEnrichResult>('/knowledge/enrich_online', {
    topic,
    max_results: maxResults,
  })
  return res.data
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/** Get document counts per type and total. */
export const getKnowledgeStats = async (): Promise<KnowledgeStats> => {
  const res = await http.get<KnowledgeStats>('/knowledge/stats')
  return res.data
}
