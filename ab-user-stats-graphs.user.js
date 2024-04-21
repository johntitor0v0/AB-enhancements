// ==UserScript==
// @name        AB User Stats Graphs
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/user.php*
// @version     1.0
// @author      Marv
// @description Generate graphs for user stats like torrents uploaded.
// @require     https://unpkg.com/micromodal@0.4.10/dist/micromodal.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/d3/5.16.0/d3.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.20/c3.min.js
// @resource    c3CSS https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.20/c3.min.css
// @grant       GM.addStyle
// @grant       GM.getResourceText
// @grant       GM.setValue
// @grant       GM.getValue
// ==/UserScript==

const DELAY_MS = 505;

const ADD_CSS = /* css */ `
.micromodal-slide {
  display: none;
}

.micromodal-slide.is-open {
  display: block;
}

.modal__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 99;
}

.modal__container {
  background-color: #fff;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border-radius: 10px;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
  width: 80%;
  max-width: 800px;
  margin: 1.75rem auto;
  z-index: 100;
}

.modal__container h2 {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 1rem;

}

.choice-chips {
  width: 100%;
  display: flex;
  justify-content: space-around;
  padding: 10px;
}

.choice-chips input[type="radio"] {
  display: none;
}

.choice-chips label {
  padding: 10px 20px;
  font-size: 1.2rem;
  border: 2px solid #000;
  border-radius: 25px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.choice-chips label:hover {
  background-color: #f0f0f0;
}

.choice-chips input[type="radio"]:checked + label {
  background-color: #000;
  color: #fff;
}

.primary-button {
  display: block;
  width: 100%;
  padding: 15px;
  margin-top: 20px;
  font-size: 1.2rem;
  text-align: center;
  color: #fff;
  background-color: #000;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.primary-button:hover {
  background-color: #333;
}
`;

(() => {
  // Add CSS
  GM.addStyle(GM.getResourceText('microModalCSS'));
  GM.addStyle(ADD_CSS);
  GM.addStyle(GM.getResourceText('c3CSS'));

  // Create modal
  document.body.insertAdjacentHTML(
    'beforeend',
    /* html */ `<div id="ab-user-stats-graphs-modal" class="modal micromodal-slide" aria-hidden="true">
        <div class="modal__overlay" tabindex="-1" data-micromodal-close>
          <main id="ab-user-stats-graphs-modal-content" class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-1-title">
            <h2>Generate Graph</h2>
            <div class="choice-chips">
              <input type="radio" id="uploaded" name="choice" value="Uploaded" checked>
              <label for="uploaded">Uploaded</label>

              <input type="radio" id="seeding" name="choice" value="Seeding">
              <label for="seeding">Seeding</label>

              <input type="radio" id="leeching" name="choice" value="Leeching">
              <label for="leeching">Leeching</label>

              <input type="radio" id="snatched" name="choice" value="Snatched">
              <label for="snatched">Snatched</label>
            </div>
            <button id="generate-button" class="primary-button">Generate</button>
            <div id="ab-user-stats-graph-cumulative" style="display: none;"></div>
            <div id="ab-user-stats-graph-daily" style="display: none;"></div>
          </main>
        </div>
      </div>`
  );

  // Generate graph
  document
    .getElementById('generate-button')
    .addEventListener('click', async () => {
      const choice = document.querySelector('input[name="choice"]:checked').id;
      const userid = new URLSearchParams(window.location.search).get('id');

      const cacheKey = `${userid}-${choice}-stats`;
      /**
       * @type {Array<{name: string, uploaded: number}>}
       */
      const stats = await GM.getValue(cacheKey, []);
      console.log('Cached stats:', stats);
      if (stats.length === 0) {
        // Iterate upwards until no more torrents are found
        let page = 1;
        while (true) {
          console.log('Fetching page', page);
          const newStats = await getStatsForPage(userid, page, choice);
          if (newStats.length === 0) break;
          console.log('Found', newStats.length, 'torrents');
          stats.push(...newStats);
          page++;
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
        await GM.setValue(cacheKey, stats);
      }

      // Get amount of torrents uploaded per day as well as the total cumulative amount of torrents at that day
      /**
       * @type {Map<number, {count: number, total: number}>}
       */
      const statsMap = new Map(); // date -> {count, total}
      let total = 0;
      stats
        .sort((a, b) => a.uploaded - b.uploaded)
        .forEach((stat) => {
          const date = new Date(stat.uploaded);
          const day = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          ).getTime();
          total++;
          if (statsMap.has(day)) {
            const curr = statsMap.get(day);
            statsMap.set(day, { count: curr.count + 1, total });
          } else {
            statsMap.set(day, { count: 1, total });
          }
        });

      console.log('Stats map:', statsMap);

      // c3 time chart
      const cumulativeChart = c3.generate({
        bindto: '#ab-user-stats-graph',
        data: {
          x: 'x',
          columns: [
            [
              'x',
              ...Array.from(statsMap.keys()).map(
                (time) => new Date(time).toISOString().split('T')[0]
              ),
            ],
            [
              'Torrents Uploaded',
              ...Array.from(statsMap.values()).map((stat) => stat.total),
            ],
          ],
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: '%Y-%m-%d',
            },
          },
        },
        title: {
          text: 'Cumulative Torrents Uploaded',
        },
      });
      document.getElementById('ab-user-stats-graph-cumulative').style.display = 'block';
      
      const dailyChart = c3.generate({
        bindto: '#ab-user-stats-graph-daily',
        data: {
          x: 'x',
          type: 'scatter',
          columns: [
            [
              'x',
              ...Array.from(statsMap.keys()).map(
                (time) => new Date(time).toISOString().split('T')[0]
              ),
            ],
            [
              'Torrents Uploaded',
              ...Array.from(statsMap.values()).map((stat) => stat.count),
            ],
          ],
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: '%Y-%m-%d',
            },
          },
        },
        title: {
          text: 'Daily Torrents Uploaded',
        },
      });
      document.getElementById('ab-user-stats-graph-daily').style.display = 'block';
    });

  // Add generate graph button
  [...document.querySelectorAll('h3')]
    .find((elem) => elem.textContent === 'Tracker Stats')
    .insertAdjacentHTML(
      'afterend',
      /* html */ `<div id="ab-user-stats-graphs-open" style="font-weight: 500;">
      [<a href="javascript:void(0)" data-custom-open="ab-user-stats-graphs-modal">Generate Graph</a>]
    </div>`
    );

  MicroModal.init(
    {
      openTrigger: 'data-custom-open',
      disableScroll: true,
    },
    document.getElementById('ab-user-stats-graphs-modal')
  );
})();

/**
 * Retrieves statistics for a specific page of torrents for a given user.
 *
 * @param {number} userid - The ID of the user.
 * @param {number} page - The page number of the torrents.
 * @param {string} type - The type of torrents.
 */
async function getStatsForPage(userid, page, type) {
  const pageURL = (userID, page, type) =>
    `https://animebytes.tv/alltorrents.php?page=${page}&userid=${userID}&type=${type}&order_by=time&order_way=DESC`;
  const response = await fetch(pageURL(userid, page, type));
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = [
    ...doc.querySelectorAll('table.torrent_table > tbody > tr.torrent'),
  ];
  return rows.map((row) => {
    const nameAnchor = row.querySelector(
      'td:nth-child(2) > a[href^="/series.php?id="]'
    );
    const name = nameAnchor?.textContent || '';

    const timeSpan = row.querySelector('td:nth-child(4) > span');
    const timeUploaded = timeSpan ? timeSpan.getAttribute('title') : 0;
    const uploaded = new Date(timeUploaded).getTime();

    return { name, uploaded };
  });
}
