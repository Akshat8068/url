import { useState } from 'react'
import { Copy, Check, Trash2, ExternalLink, Clock, Tag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { UrlResponse } from '../types'

interface Props {
  url: UrlResponse
  onDelete: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function UrlCard({ url, onDelete }: Props) {
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(url.shortUrl)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(url.shortCode)
  }

  const badge = url.isExpired
    ? { label: 'Expired', cls: 'bg-red-100 text-red-600' }
    : url.isActive
      ? { label: 'Active', cls: 'bg-green-100 text-green-600' }
      : { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' }

  return (
    <div
      onClick={() => navigate(`/urls/${url.shortCode}`)}
      className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {url.title && (
            <p className="text-sm font-semibold text-gray-800 truncate mb-0.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {url.title}
            </p>
          )}
          <p className="text-xs text-gray-400 truncate">{url.originalUrl}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Short URL */}
      <div className="mt-3 flex items-center gap-2">
        <a
          href={url.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1 truncate"
        >
          {url.shortUrl}
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
        {url.customAlias && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            alias: {url.customAlias}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          {timeAgo(url.createdAt)}
          {url.expiresAt && (
            <span className="ml-2 text-amber-500">
              · expires {new Date(url.expiresAt).toLocaleDateString()}
            </span>
          )}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy short URL"
            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDelete}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
