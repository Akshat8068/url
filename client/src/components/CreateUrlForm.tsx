import { useState } from 'react'
import { Link2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { createShortUrl, extractErrorMessage } from '../services/api'
import type { CreateShortUrlPayload, UrlResponse } from '../types'

interface Props {
  onCreated: (url: UrlResponse) => void
}

export default function CreateUrlForm({ onCreated }: Props) {
  const [originalUrl, setOriginalUrl] = useState('')
  const [customAlias, setCustomAlias] = useState('')
  const [title, setTitle] = useState('')
  const [expiresInMinutes, setExpiresInMinutes] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!originalUrl.trim()) return

    const payload: CreateShortUrlPayload = { originalUrl: originalUrl.trim() }
    if (customAlias.trim()) payload.customAlias = customAlias.trim()
    if (title.trim()) payload.title = title.trim()
    if (expiresInMinutes.trim()) payload.expiresInMinutes = Number(expiresInMinutes)

    setLoading(true)
    try {
      const result = await createShortUrl(payload)
      onCreated(result)
      toast.success('Short URL created!')
      setOriginalUrl('')
      setCustomAlias('')
      setTitle('')
      setExpiresInMinutes('')
      setShowAdvanced(false)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-blue-500" />
        Shorten a URL
      </h2>

      {/* Main URL input */}
      <div className="flex gap-3">
        <input
          type="url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          placeholder="https://your-long-url.com/goes/here"
          required
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-3 rounded-xl text-sm transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Shorten
        </button>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Advanced options
      </button>

      {showAdvanced && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Custom alias
            </label>
            <input
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder="my-link"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My link title"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Expires in (minutes)
            </label>
            <input
              type="number"
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(e.target.value)}
              placeholder="e.g. 1440"
              min={1}
              max={525600}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
        </div>
      )}
    </form>
  )
}
