export type SubtitleFolder = {
  id: number
  name: string | null
  path: string
}

export type SubtitleMapping = {
  id: number
  subtitleFilename: string
  subtitleType: 'lrc' | 'vtt'
  confidence: number
  source: 'local' | 'library'
}

export type SubtitleMappingResponse = {
  mappings: SubtitleMapping[]
  subtitleMissing: boolean
}

export type SubtitleFoldersResponse = {
  folders: SubtitleFolder[]
}

export type VttCue = {
  startTime: number
  endTime: number
  text: string
}