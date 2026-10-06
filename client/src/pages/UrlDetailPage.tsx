import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Clock,
  Tag,
  Link2,
  Hash,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getUrl, deleteUrl, extractErrorMessage } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import type { UrlResponse } from '../types'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="w-36 shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-700 break-all">{value}</span>
    </div>
  )
}

export default function UrlDetailPage() {
  const { idOrCode } = useParams<{ idOrCode: string }>()
  const navigate = useNavigate()

  const [url, setUrl] = useState<UrlResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!idOrCode) return
    setLoading(true)
    getUrl(idOrCode)
      .then(setUrl)
      .catch((err) => {
        const msg = extractErrorMessage(err)
        if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          setNotFound(true)
        } else {
          toast.error(msg)
        }
      })
      .finally(() => setLoading(false))
  }, [idOrCode])

  async function handleCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url.shortUrl)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDeleteConfirm() {
    if (!url) return
    try {
      await deleteUrl(url.shortCode)
      toast.success('URL deleted')
      navigate('/')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (notFound || !url) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">URL not found</h2>
        <p className="text-sm text-gray-400 mb-6">
          No URL matching <span className="font-mono">{idOrCode}</span> was found.
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to home
        </button>
      </div>
    )
  }

  const badge = url.isExpired
    ? { label: 'Expired', cls: 'bg-red-100 text-red-600' }
    : url.isActive
      ? { label: 'Active', cls: 'bg-green-100 text-green-600' }
      : { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-800 truncate flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400 shrink-0" />
              {url.title ?? url.shortCode}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{url.originalUrl}</p>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* Short URL action bar */}
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 mb-6">
          <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
          <a
            href={url.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm text-blue-600 font-medium hover:underline truncate flex items-center gap-1"
          >
            {url.shortUrl}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          <button
            onClick={handleCopy}
            className="shrink-0 p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition"
            title="Copy"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Detail rows */}
        <div className="divide-y divide-gray-50">
          <Row label="Short code" value={
            <span className="font-mono flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-gray-400" />{url.shortCode}
            </span>
          } />
          {url.customAlias && <Row label="Custom alias" value={url.customAlias} />}
          <Row label="Original URL" value={
            <a
              href={url.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-1"
            >
              {url.originalUrl} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          } />
          <Row label="Created" value={
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {new Date(url.createdAt).toLocaleString()}
            </span>
          } />
          <Row label="Updated" value={new Date(url.updatedAt).toLocaleString()} />
          {url.expiresAt && (
            <Row
              label="Expires at"
              value={
                <span className={url.isExpired ? 'text-red-500' : 'text-amber-600'}>
                  {new Date(url.expiresAt).toLocaleString()}
                </span>
              }
            />
          )}
        </div>

        {/* Delete */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-xl transition"
          >
            <Trash2 className="w-4 h-4" /> Delete URL
          </button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          message={`Delete "${url.title ?? url.shortCode}"? This cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
