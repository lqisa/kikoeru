const { knex } = require('./db')

const dbVersion = '20210502081522'

const VIEW_SQL = `
  CREATE VIEW staticMetadata AS
  SELECT baseQueryWithVA.*,
    json_object('tags', json_group_array(json_object('id', t_tag.id, 'name', t_tag.name))) AS tagObj
  FROM (
    SELECT baseQuery.*,
      json_object('vas', json_group_array(json_object('id', t_va.id, 'name', t_va.name))) AS vaObj
    FROM (
      SELECT t_work.id, 
        t_work.title,
        t_work.circle_id,
        t_circle.name,
        json_object('id', t_work.circle_id, 'name', t_circle.name) AS circleObj,
        t_work.nsfw,
        t_work.release,
        t_work.dl_count,
        t_work.price,
        t_work.review_count,
        t_work.rate_count,
        t_work.rate_average_2dp,
        t_work.rate_count_detail,
        t_work.rank,
        t_work.root_folder,
        t_work.dir
      FROM t_work
      JOIN t_circle ON t_circle.id = t_work.circle_id
    ) AS baseQuery
    LEFT JOIN r_va_work ON r_va_work.work_id = baseQuery.id
    LEFT JOIN t_va ON t_va.id = r_va_work.va_id
    GROUP BY baseQuery.id
  ) AS baseQueryWithVA
  LEFT JOIN r_tag_work ON r_tag_work.work_id = baseQueryWithVA.id
  LEFT JOIN t_tag ON t_tag.id = r_tag_work.tag_id
  GROUP BY baseQueryWithVA.id;
`

const createStaticMetadataView = () => knex.schema
  .raw(`DROP VIEW IF EXISTS staticMetadata`)
  .raw(VIEW_SQL)

const createSchema = () => knex.schema
  .createTable('t_circle', (table) => {
    table.increments()
    table.string('name').notNullable()
  })
  .createTable('t_work', (table) => {
    table.string('id').primary()
    table.string('root_folder').notNullable()
    table.string('dir').notNullable()
    table.string('title').notNullable()
    table.integer('circle_id').notNullable()
    table.boolean('nsfw')
    table.string('cover_url_fallback')
    table.string('release')

    table.integer('dl_count')
    table.integer('price')
    table.integer('review_count')
    table.integer('rate_count')
    table.float('rate_average_2dp')
    table.text('rate_count_detail')
    table.text('rank')

    table.foreign('circle_id').references('id').inTable('t_circle')
    table.index(['circle_id', 'release', 'dl_count', 'review_count', 'price', 'rate_average_2dp'], 't_work_index')
  })
  .createTable('t_tag', (table) => {
    table.increments()
    table.string('name').notNullable()
  })
  .createTable('t_va', (table) => {
    table.string('id')
    table.string('name').notNullable()
    table.primary('id')
  })
  .createTable('r_tag_work', (table) => {
    table.integer('tag_id')
    table.string('work_id')
    table.foreign('tag_id').references('id').inTable('t_tag')
    table.foreign('work_id').references('id').inTable('t_work')
    table.primary(['tag_id', 'work_id'])
  })
  .createTable('r_va_work', (table) => {
    table.string('va_id')
    table.string('work_id')
    table.foreign('va_id').references('id').inTable('t_va').onUpdate('CASCADE').onDelete('CASCADE')
    table.foreign('work_id').references('id').inTable('t_work').onUpdate('CASCADE').onDelete('CASCADE')
    table.primary(['va_id', 'work_id'])
  })
  .createTable('t_user', (table) => {
    table.string('name').notNullable()
    table.string('password').notNullable()
    table.string('group').notNullable()
    table.primary(['name'])
  })
  .createTable('t_review', (table) => {
    table.string('user_name').notNullable()
    table.string('work_id').notNullable()
    table.integer('rating')
    table.string('review_text')
    table.timestamps(true, true)
    table.string('progress')
    table.foreign('user_name').references('name').inTable('t_user').onDelete('CASCADE')
    table.foreign('work_id').references('id').inTable('t_work').onDelete('CASCADE')
    table.primary(['user_name', 'work_id'])
  })
  .raw(`DROP VIEW IF EXISTS staticMetadata`)
  .raw(VIEW_SQL)
  .then(() => {
    console.log(' * 成功构建数据库结构.')
  })
  .catch((err) => {
    if (err.toString().indexOf('table `t_circle` already exists') !== -1) {
      console.log(' * 数据库结构已经存在.')
    } else {
      throw err
    }
  })

module.exports = { createSchema, createStaticMetadataView, dbVersion }