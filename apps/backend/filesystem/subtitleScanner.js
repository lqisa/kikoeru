const fs = require('fs')
const path = require('path')
const { knex } = require('../database/db')
const { matchSubtitles } = require('./subtitleMatcher')

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])
const WORK_ID_PATTERN = /^(RJ|VJ)(\d+)$/i

const stripPrefix = (dirName) => {
  const m = dirName.match(WORK_ID_PATTERN)
  if (!m) return null
  return m[2]
}

const scan = async () => {
  let added = 0
  let removed = 0

  try {
    const folders = await knex('t_subtitle_folder').select('*')

    for (const folder of folders) {
      if (!fs.existsSync(folder.path)) {
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

        const work = await knex('t_work').select('id').where('id', numericId).first()
        if (!work) {
          process.send({ event: 'SUBTITLE_SCAN_PROGRESS', payload: { message: `数据库中未找到作品: ${workDir.name}` } })
          continue
        }

        const workId = work.id
        const fullWorkPath = path.join(folder.path, workDir.name)

        let subEntries
        try {
          subEntries = fs.readdirSync(fullWorkPath, { withFileTypes: true })
        } catch (_) {
          continue
        }

        const subtitleFiles = subEntries
          .filter(e => e.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
          .map(e => e.name)

        const existingMappings = await knex('t_subtitle_mapping')
          .where('work_id', workId)
          .where('subtitle_folder_id', folder.id)
          .select('*')

        const existingFiles = new Set(existingMappings.map(m => m.subtitle_filename))
        const currentFiles = new Set(subtitleFiles)

        for (const sf of subtitleFiles) {
          if (!existingFiles.has(sf)) {
            const ext = path.extname(sf).toLowerCase()
            const row = {
              work_id: workId,
              audio_filename: sf,
              subtitle_filename: sf,
              subtitle_folder_id: folder.id,
              subtitle_type: ext === '.lrc' ? 'lrc' : 'vtt',
              confidence: 1.0
            }
            await knex('t_subtitle_mapping').insert(row)
            added++
          }
        }

        for (const existing of existingMappings) {
          if (!currentFiles.has(existing.subtitle_filename)) {
            await knex('t_subtitle_mapping').where('id', existing.id).del()
            removed++
          }
        }
      }
    }

    process.send({
      event: 'SUBTITLE_SCAN_FINISHED',
      payload: { message: '字幕扫描完成.', added, removed }
    })
  } catch (err) {
    process.send({
      event: 'SUBTITLE_SCAN_ERROR',
      payload: { message: `字幕扫描失败: ${err.message}` }
    })
  }

  process.exit(0)
}

scan()