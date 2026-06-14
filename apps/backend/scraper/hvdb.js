const cheerio = require('cheerio');
const axios = require('./axios');
const { nameToUUID } = require('./utils');

const scrapeWorkMetadataFromHVDB = id => new Promise((resolve, reject) => {
  const rjcode = id;
  const url = `https://hvdb.me/Dashboard/WorkDetails/${id}`;

  console.log(`[RJ${rjcode}] 从 HVDB 抓取元数据...`);
  axios.retryGet(url, { retry: {} })
    .then(response => {
      const $ = cheerio.load(response.data);

      const work = {
        id: rjcode.replace('RJ', ''),
        title: $('h2').text().trim().replace('Work Details - ', ''),
        coverURL: $('.detailImage').attr('src') || '',
        circle: {},
        vas: [],
        tags: [],
        nsfw: true, // 默认值为 true
        release: null,
        series: null,
        dl_count: null,
        rate_average_2dp: null,
        rate_count: null,
        price: null,
      };

      if (work.coverURL && work.coverURL.startsWith('/')) {
        work.coverURL = `https://hvdb.me${work.coverURL}`;
      }

      $('a[href*="CircleWorks"]').each(function () {
        const href = $(this).attr('href');
        const name = $(this).text().trim();
        if (href) {
          work.circle = {
            id: parseInt(href.substring(href.lastIndexOf('/') + 1)),
            name
          };
        }
      });

      $('a[href*="CVWorks"]').each(function () {
        const name = $(this).text().trim();
        work.vas.push({
          id: nameToUUID(name),
          name
        });
      });

      $('a[href*="TagWorks"]').each(function () {
        const href = $(this).attr('href');
        const name = $(this).text().trim();
        if (href) {
          work.tags.push({
            id: parseInt(href.substring(href.lastIndexOf('/') + 1)),
            name
          });
        }
      });

      if (!work.title) {
        return reject(new Error("Couldn't parse data from HVDB work page."));
      }

      console.log(`[RJ${rjcode}] 成功从 HVDB 抓取元数据...`);
      resolve(work);
    })
    .catch((error) => {
      if (error.response) {
        reject(new Error(`Couldn't request work page HTML (${url}), received: ${error.response.status}.`));
      } else {
        reject(error);
      }
    });
});

module.exports = scrapeWorkMetadataFromHVDB;