import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Search, RefreshCw } from 'lucide-react'
import CreateUrlForm from '../components/CreateUrlForm'
import UrlCard from '../components/UrlCard'
import ConfirmDialog from '../components/ConfirmDialog'
import { getAllUrls, deleteUrl, extractErrorMessage } from '../services/api'
import type { UrlResponse } from '../types'

export default function HomePage() {
  const [urls, setUrls] = useState<UrlResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchUrls = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllUrls()
      setUrls(data)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUrls() }, [fetchUrls])

  function handleCreated(url: UrlResponse) {
    setUrls((prev) => [url, ...prev])
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await deleteUrl(deleteTarget)
      setUrls((prev) => prev.filter((u) => u.shortCode !== deleteTarget))
      toast.success('URL deleted')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setDeleteTarget(null)
    }
  }

  const filtered = urls.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.originalUrl.toLowerCase().includes(q) ||
      u.shortCode.toLowerCase().includes(q) ||
      (u.title ?? '').toLowerCase().includes(q) ||
      (u.customAlias ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Create form */}
      <CreateUrlForm onCreated={handleCreated} />

      {/* List header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search URLs…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        <button
          onClick={fetchUrls}
          title="Refresh"
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* URL list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">
          {search ? 'No URLs match your search.' : 'No URLs yet — shorten one above!'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((url) => (
            <UrlCard key={url.shortCode} url={url} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Confirm delete dialog */}
      {deleteTarget && (
        <ConfirmDialog
          message="Are you sure you want to delete this short URL? This cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
