export function extractBestEffortJson(text: string): string | null {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  return text.slice(first, last + 1)
}

export function safeParseJson<T>(text: string): { parsed?: T; error?: string } {
  try {
    return { parsed: JSON.parse(text) as T }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown JSON parse error' }
  }
}

