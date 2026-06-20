const fs = require('fs')
const path = require('path')
const { knex } = require('../database/db')
const { config } = require('../config')
const { matchSubtitles } = require('./subtitleMatcher')

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.opus', '.wav', '.aac', '.flac', '.webm', '.mp4', '.m4a'])
const WORK_ID_PATTERN = /^(RJ|VJ)(\d+)$/i

const stripPrefix = (dirName) => {
  const m = dirName.match(WORK_ID_PATTERN)
  if (!m) return null
  return m[2]
}

const walkSubtitleFiles = (dir, currentDepth, maxDepth) => {
  const results = []
  if (currentDepth > maxDepth) return results
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (_) {
    return results
  }
  for (const entry of entries) {
    if (entry.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push({ filename: entry.name, relativePath: '' })
    } else if (entry.isDirectory() && currentDepth < maxDepth) {
      const subResults = walkSubtitleFiles(path.join(dir, entry.name), currentDepth + 1, maxDepth)
      for (const r of subResults) {
        r.relativePath = r.relativePath ? `${entry.name}/${r.relativePath}` : entry.name
      }
      results.push(...subResults)
    }
  }
  return results
}

const getAudioFilesForWork = (work) => {
  const rootFolder = config.rootFolders.find(rf => rf.name === work.root_folder)
  if (!rootFolder) return []

  const workDir = path.join(rootFolder.path, work.dir)
  if (!fs.existsSync(workDir)) return []

  const walkDir = (dir) => {
    let results = []
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          results.push(entry.name)
        } else if (entry.isDirectory()) {
          results = results.concat(walkDir(path.join(dir, entry.name)))
        }
      }
    } catch (_) {}
    return results
  }

  return walkDir(workDir)
}

const scan = async () => {
  let added = 0
  let removed = 0

  try {
    const folders = await knex('t_subtitle_folder').select('*')
    console.log(`[subtitleScanner] 开始扫描, 共 ${folders.length} 个字幕目录`)

    for (const folder of folders) {
      if (!fs.existsSync(folder.path)) {
        console.warn(`[subtitleScanner] 目录不可访问: ${folder.path}`)
        process.send({ event: 'SUBTITLE_SCAN_PROGRESS', payload: { message: `目录不可访问: ${folder.path}` } })
        continue
      }

      let entries
      try {
        entries = fs.readdirSync(folder.path, { withFileTypes: true })
      } catch (err) {
        process.send({ event: 'SUBTITLE_SCAN_PROGRESS', payload: { message: `无法读取目录: ${folder.path}` } })
        continue
      }

      const workDirs = entries.filter(e => e.isDirectory() && WORK_ID_PATTERN.test(e.name))

      for (const workDir of workDirs) {
        const numericId = stripPrefix(workDir.name)
        if (!numericId) continue

        const work = await knex('t_work').select('id', 'root_folder', 'dir').where('id', numericId).first()
        if (!work) {
          console.warn(`[subtitleScanner] 数据库中未找到作品: ${workDir.name}`)
          process.send({ event: 'SUBTITLE_SCAN_PROGRESS', payload: { message: `数据库中未找到作品: ${workDir.name}` } })
          continue
        }

        const workId = work.id
        const fullWorkPath = path.join(folder.path, workDir.name)
        const maxDepth = folder.scan_depth || 3

        const subtitleFiles = walkSubtitleFiles(fullWorkPath, 1, maxDepth)

        const deletedCount = await knex('t_subtitle_mapping')
          .where('work_id', workId)
          .where('subtitle_folder_id', folder.id)
          .del()
        removed += deletedCount

        if (subtitleFiles.length === 0) continue

        const audioFiles = getAudioFilesForWork(work)
        const subtitleFilenames = subtitleFiles.map(s => s.filename)

        if (audioFiles.length > 0) {
          for (const audioFile of audioFiles) {
            const matches = matchSubtitles(audioFile, subtitleFilenames)
            for (const m of matches) {
              const sf = subtitleFiles.find(s => s.filename === m.subtitleFilename)
              const row = {
                work_id: workId,
                audio_filename: audioFile,
                subtitle_filename: m.subtitleFilename,
                subtitle_relative_path: sf ? sf.relativePath : '',
                subtitle_folder_id: folder.id,
                subtitle_type: m.subtitleType,
                confidence: m.confidence
              }
              await knex('t_subtitle_mapping').insert(row)
              added++
            }
          }
        } else {
          for (const sf of subtitleFiles) {
            const ext = path.extname(sf.filename).toLowerCase()
            const row = {
              work_id: workId,
              audio_filename: null,
              subtitle_filename: sf.filename,
              subtitle_relative_path: sf.relativePath,
              subtitle_folder_id: folder.id,
              subtitle_type: ext === '.lrc' ? 'lrc' : 'vtt',
              confidence: 1.0
            }
            await knex('t_subtitle_mapping').insert(row)
            added++
          }
        }
      }
    }

    process.send({
      event: 'SUBTITLE_SCAN_FINISHED',
      payload: { message: '字幕扫描完成.', added, removed }
    })
    console.log(`[subtitleScanner] 扫描完成, 新增: ${added}, 移除: ${removed}`)
  } catch (err) {
    process.send({
      event: 'SUBTITLE_SCAN_ERROR',
      payload: { message: `字幕扫描失败: ${err.message}` }
    })
    console.error(`[subtitleScanner] 扫描失败:`, err)
  }

  process.exit(0)
}

scan()