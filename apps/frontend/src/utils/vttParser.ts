import type { VttCue } from '../types/subtitle'

const parseTimestamp = (ts: string): number => {
  const parts = ts.trim().split(':')
  if (parts.length === 3) {
    const h = parts[0] ?? '0'
    const m = parts[1] ?? '0'
    const rest = parts[2] ?? '0.0'
    const secParts = rest.split('.')
    const s = secParts[0] ?? '0'
    const ms = secParts[1] ?? '0'
    return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
  }
  if (parts.length === 2) {
    const m = parts[0] ?? '0'
    const rest = parts[1] ?? '0.0'
    const secParts = rest.split('.')
    const s = secParts[0] ?? '0'
    const ms = secParts[1] ?? '0'
    return Number(m) * 60 + Number(s) + Number(ms) / 1000
  }
  return 0
}

export const parseVtt = (content: string): VttCue[] => {
  const cues: VttCue[] = []
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  let i = 0

  while (i < lines.length && !(lines[i] ?? '').includes('-->')) {
    i++
  }

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line) { i++; continue }
    const arrowMatch = line.match(/(\d[\d:.*\d]+)\s*-->\s*(\d[\d:.*\d]+)/)
    if (arrowMatch) {
      const startTime = parseTimestamp(arrowMatch[1] ?? '0')
      const endTime = parseTimestamp(arrowMatch[2] ?? '0')
      i++
      const textLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trim() !== '') {
        textLines.push((lines[i] ?? '').trim())
        i++
      }
      if (textLines.length > 0) {
        cues.push({ startTime, endTime, text: textLines.join('\n') })
      }
    } else {
      i++
    }
  }

  return cues
}

export const parseLrc = (content: string): VttCue[] => {
  const cues: VttCue[] = []
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  const timeTagRegex = /\[(\d{1,3}):(\d{2})(?:[.:])(\d{2,3})\]/g

  for (const line of lines) {
    const timestamps: number[] = []
    let match: RegExpExecArray | null
    timeTagRegex.lastIndex = 0
    while ((match = timeTagRegex.exec(line)) !== null) {
      const min = Number(match[1])
      const sec = Number(match[2])
      const msRaw = match[3] ?? '0'
      const ms = msRaw.length === 2 ? msRaw + '0' : msRaw
      timestamps.push(min * 60 + sec + Number(ms) / 1000)
    }

    const text = line.replace(/\[\d{1,3}:\d{2}[.:]\d{2,3}\]/g, '').trim()
    if (timestamps.length > 0 && text) {
      for (const ts of timestamps) {
        cues.push({ startTime: ts, endTime: ts + 5, text })
      }
    }
  }

  cues.sort((a, b) => a.startTime - b.startTime)

  for (let i = 0; i < cues.length - 1; i++) {
    const current = cues[i]
    const next = cues[i + 1]
    if (current && next) {
      current.endTime = next.startTime
    }
  }

  return cues
}