/**
 * Thin wrapper around fetch that attaches the bearer token, sets the JSON
 * content-type when a body is present, and normalizes error handling: a
 * non-OK response throws using the server's `error` message when available.
 */
export async function authFetch<T>(
  url: string,
  token: string | null,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error || 'Request failed')
  }

  return res.json()
}