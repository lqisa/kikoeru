exports.up = function (knex) {
  return knex.schema.alterTable('t_subtitle_mapping', (table) => {
    table.string('audio_filename').nullable().alter()
  })
}

exports.down = function (knex) {
  return knex.schema.alterTable('t_subtitle_mapping', (table) => {
    table.string('audio_filename').notNullable().alter()
  })
}