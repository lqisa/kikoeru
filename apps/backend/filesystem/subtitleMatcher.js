const path = require('path')

const extractTrackNumber = (filename) => {
  const name = path.basename(filename, path.extname(filename))
  const patterns = [
    /^(\d+)/,
    /^Track\s*(\d+)/i,
    /^第(\d+)/,
    /^(\d+)\s*[.\-_]/
  ]
  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return null
}

const normalize = (str) => {
  const name = path.basename(str, path.extname(str))
  return name
    .replace(/[\uff10-\uff19]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\uff21-\uff3a\uff41-\uff5a]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, ' ')
    .trim()
}

const levenshteinDistance = (a, b) => {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

const similarity = (a, b) => {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(na, nb) / maxLen
}

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])

const matchSubtitles = (audioFilename, subtitleFiles) => {
  const audioTrackNum = extractTrackNumber(audioFilename)
  const results = []

  for (const sf of subtitleFiles) {
    const ext = path.extname(sf).toLowerCase()
    if (!SUBTITLE_EXTENSIONS.has(ext)) continue

    const subTrackNum = extractTrackNumber(sf)
    let conf = 0

    if (audioTrackNum !== null && subTrackNum !== null && audioTrackNum === subTrackNum) {
      const nameSim = similarity(audioFilename, sf)
      conf = 0.5 + 0.5 * nameSim
    } else {
      const nameSim = similarity(audioFilename, sf)
      conf = nameSim * 0.7
    }

    if (conf >= 0.5) {
      results.push({
        subtitleFilename: path.basename(sf),
        subtitleType: ext === '.lrc' ? 'lrc' : 'vtt',
        confidence: Math.round(conf * 1000) / 1000
      })
    }
  }

  results.sort((a, b) => {
    if (a.subtitleType === 'lrc' && b.subtitleType !== 'lrc') return -1
    if (a.subtitleType !== 'lrc' && b.subtitleType === 'lrc') return 1
    return b.confidence - a.confidence
  })

  return results
}

module.exports = { matchSubtitles, extractTrackNumber, normalize, levenshteinDistance, similarity }