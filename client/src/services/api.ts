import axios from 'axios'
import type { UrlResponse, CreateShortUrlPayload } from '../types'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Normalise error messages coming from the NestJS backend
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] }
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}

// POST /api/urls
export async function createShortUrl(payload: CreateShortUrlPayload): Promise<UrlResponse> {
  const { data } = await http.post<UrlResponse>('/urls', payload)
  return data
}

// GET /api/urls
export async function getAllUrls(): Promise<UrlResponse[]> {
  const { data } = await http.get<UrlResponse[]>('/urls')
  return data
}

// GET /api/urls/:idOrCode
export async function getUrl(idOrCode: string): Promise<UrlResponse> {
  const { data } = await http.get<UrlResponse>(`/urls/${idOrCode}`)
  return data
}

// DELETE /api/urls/:id
export async function deleteUrl(id: string): Promise<void> {
  await http.delete(`/urls/${id}`)
}
