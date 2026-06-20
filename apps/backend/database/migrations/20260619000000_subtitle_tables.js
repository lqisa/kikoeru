exports.up = function (knex) {
  return knex.schema
    .createTable('t_subtitle_folder', (table) => {
      table.increments()
      table.string('name')
      table.string('path').notNullable().unique()
      table.integer('scan_depth').notNullable().defaultTo(3)
    })
    .createTable('t_subtitle_mapping', (table) => {
      table.increments()
      table.string('work_id').notNullable()
      table.string('audio_filename').nullable()
      table.string('subtitle_filename').notNullable()
      table.string('subtitle_relative_path').notNullable().defaultTo('')
      table.integer('subtitle_folder_id').unsigned().nullable()
      table.string('subtitle_type').notNullable()
      table.float('confidence').notNullable()
      table.foreign('work_id').references('id').inTable('t_work').onDelete('CASCADE')
      table.foreign('subtitle_folder_id').references('id').inTable('t_subtitle_folder').onDelete('CASCADE')
    })
    .raw('CREATE INDEX IF NOT EXISTS idx_subtitle_mapping_work ON t_subtitle_mapping(work_id, audio_filename)')
}

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('t_subtitle_mapping')
    .dropTableIfExists('t_subtitle_folder')
}