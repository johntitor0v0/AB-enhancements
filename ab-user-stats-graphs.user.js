// ==UserScript==
// @name        AB User Stats Graphs
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/user.php*
// @version     1.1
// @author      Marv
// @icon        https://avatars.githubusercontent.com/u/17340496
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

const DELAY_MS = 5055;

const cacheKey = (userid, choice) => `v0-${userid}-${choice}-stats`;

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
  min-width: 800px;
  margin: 1.75rem auto;
  z-index: 100;
  overflow-y: auto;
  max-height: 90vh;
}

.modal__container::-webkit-scrollbar {
  display: none;
}

.modal__container h2 {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 1rem;

}

.ab-user-stats-graphs {
  margin: 2rem;
  display: flex;

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

#ab-user-stats-graphs-progress-container {
  width: 100%;
}

#ab-user-stats-graphs-progress {
  width: 100%;
  height: 25px;
  background-color: #fff;
  border: 2px solid #000;
  border-radius: 10px;
  overflow: hidden;
}

#ab-user-stats-graphs-progress::-webkit-progress-bar {
  background-color: #fff;
}

#ab-user-stats-graphs-progress::-webkit-progress-value,
#ab-user-stats-graphs-progress::-moz-progress-bar {
  background: #000;
  border-radius: 15px;
}

#ab-user-stats-graphs-progress-text {
  text-align: center;
  font-size: 1rem;
  color: #000;
  margin-top: 10px;
}
`;

(() => {
  // Add CSS
  GM.addStyle(GM.getResourceText('microModalCSS'));
  GM.addStyle(ADD_CSS);
  GM.addStyle(GM.getResourceText('c3CSS'));

  const userid = new URLSearchParams(window.location.search).get('id');
  // Get user name
  const username = document.querySelector(
    '#content a[href^="/user/profile"]'
  )?.textContent;

  // Create modal
  document.body.insertAdjacentHTML(
    'beforeend',
    /* html */ `<div id="ab-user-stats-graphs-modal" class="modal micromodal-slide" aria-hidden="true">
        <div class="modal__overlay" tabindex="-1" data-micromodal-close>
          <main id="ab-user-stats-graphs-modal-content" class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-1-title">
            <h2 id="ab-user-stats-graphs-modal-title">Generate Graph for ${username}</h2>
            <div class="choice-chips">
              <input type="radio" id="uploaded" name="choice" value="Uploaded" checked>
              <label for="uploaded">Uploaded</label>

              <input type="radio" id="snatched" name="choice" value="Snatched">
              <label for="snatched">Snatched</label>
            </div>
            <button id="generate-button" class="primary-button">Generate</button>
            <div id="ab-user-stats-graphs-progress-container" style="display: none;">
              <progress id="ab-user-stats-graphs-progress" value="0" max="100"></progress>
              <p id="ab-user-stats-graphs-progress-text"></p>
            </div>
            <div class="ab-user-stats-graphs" style="display: none;">
              <div id="ab-user-stats-graph-cumulative"></div>
              <div id="ab-user-stats-graph-daily"></div>
              <div id="ab-user-stats-graph-pie"></div>
            </div>
          </main>
        </div>
      </div>`
  );

  // Generate graph
  document
    .getElementById('generate-button')
    .addEventListener('click', async () => {
      const selectedInput = document.querySelector(
        'input[name="choice"]:checked'
      );
      const choice = selectedInput.id;
      const choiceName = selectedInput.value;

      document.getElementById(
        'ab-user-stats-graphs-progress-container'
      ).style.display = 'block';

      /**
       * @type {Object<string, number>}
       */
      let stats = await GM.getValue(cacheKey(userid, choice), {});
      console.log('Cached stats:', stats);

      // Find latest torrent date
      const latestDate = Object.values(stats).reduce(
        (latest, { date }) => Math.max(latest, date),
        0
      );
      console.log('Latest date scraped:', new Date(latestDate));

      // Iterate upwards until date past latest date or no new torrents
      let page = 1;
      while (true) {
        console.log('Fetching page', page);
        const { entries: newStats, lastPage } = await getStatsForPage(
          userid,
          page,
          choice
        );
        const newTorrentsFound = Object.keys(newStats).length;
        // Stop if no new torrents
        if (newTorrentsFound === 0) break;
        console.log('Found', newTorrentsFound, 'torrents');

        // Add new stats to existing stats
        stats = { ...stats, ...newStats };

        // Stop if any torrent is older than the latest date
        if (Object.values(newStats).some(({ date }) => date < latestDate))
          break;

        // Stop if reached last page
        if (page >= lastPage) break;

        // Update progress bar
        const progress = Math.min((page / lastPage) * 100, 100).toFixed(2);
        document.getElementById('ab-user-stats-graphs-progress').value =
          progress;
        document.getElementById(
          'ab-user-stats-graphs-progress-text'
        ).textContent = `Fetching page ${page} of ${lastPage} (${progress}%)`;

        page++;
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
      await GM.setValue(cacheKey(userid, choice), stats);

      console.log('Final stats:', stats);

      // Done fetching, make graphs
      // Hide progress
      document.getElementById(
        'ab-user-stats-graphs-progress-container'
      ).style.display = 'none';

      document.querySelector('.ab-user-stats-graphs').style.display = 'block';
      document.getElementById(
        'ab-user-stats-graphs-modal-title'
      ).textContent = `${username}'s ${choiceName} Stats`;

      // Get amount of torrents uploaded/grabbed per day as well as the total cumulative amount of torrents at that day
      /**
       * @type {Map<number, {count: number, total: number}>}
       */
      const torrentsDateMap = new Map(); // date -> {count, total}
      let total = 0;

      Object.entries(stats)
        .sort(([, { date: aVal }], [, { date: bVal }]) => aVal - bVal)
        .forEach(([, { date: dateVal }]) => {
          const date = new Date(dateVal);
          const day = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          ).getTime();
          total++;
          if (torrentsDateMap.has(day)) {
            const curr = torrentsDateMap.get(day);
            torrentsDateMap.set(day, { count: curr.count + 1, total });
          } else {
            torrentsDateMap.set(day, { count: 1, total });
          }
        });

      console.log('Stats map:', torrentsDateMap);

      // c3 time chart
      const cumulativeChart = c3.generate({
        bindto: '#ab-user-stats-graph-cumulative',
        data: {
          x: 'x',
          type: 'step',
          columns: [
            [
              'x',
              ...Array.from(torrentsDateMap.keys()).map(
                (time) => new Date(time).toISOString().split('T')[0]
              ),
            ],
            [
              `Torrents ${choiceName}`,
              ...Array.from(torrentsDateMap.values()).map((stat) => stat.total),
            ],
          ],
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: '%Y-%m-%d',
              count: 20,
            },
          },
        },
        title: {
          text: `Cumulative Torrents ${choiceName} by ${username}`,
        },
      });
      ('block');

      const dailyChart = c3.generate({
        bindto: '#ab-user-stats-graph-daily',
        data: {
          x: 'x',
          type: 'scatter',
          columns: [
            [
              'x',
              ...Array.from(torrentsDateMap.keys()).map(
                (time) => new Date(time).toISOString().split('T')[0]
              ),
            ],
            [
              `Daily Torrents ${choiceName}`,
              ...Array.from(torrentsDateMap.values()).map((stat) => stat.count),
            ],
          ],
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: '%Y-%m-%d',
              count: 20,
            },
          },
        },
        title: {
          text: `Daily Torrents ${choiceName} by ${username}`,
        },
      });

      // Graph pie chart based on amount of each type
      const typeCount = Object.values(stats).reduce((map, { type }) => {
        if (map.has(type)) {
          map.set(type, map.get(type) + 1);
        } else {
          map.set(type, 1);
        }
        return map;
      }, new Map());
      console.log('Type count:', typeCount);
      const pieChart = c3.generate({
        bindto: '#ab-user-stats-graph-pie',
        size: {
          height: 600,
        },
        data: {
          columns: Array.from(typeCount.entries()),
          type: 'pie',
        },
        tooltip: {
          format: {
            value: (value, ratio, id) => `${value} (${(ratio * 100).toFixed(2)}%)`,
          },
        },
        title: {
          text: `${username}'s Torrents ${choiceName} by Type`,
        },
      });
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
  const document = parser.parseFromString(html, 'text/html');

  const pagelinks = document.querySelectorAll('.page-link');
  const lastPage = parseInt(pagelinks[pagelinks.length - 1]?.textContent || 0);

  const rows = [
    ...document.querySelectorAll('table.torrent_table > tbody > tr.torrent'),
  ];
  return {
    /**
     * @type {Object<string, {name: string, type: string, date: number}>}
     */
    entries: rows.reduce((map, row) => {
      const torrentAnchor = row.querySelector('a[title="View Torrent"]');
      const torrentID = torrentAnchor
        .getAttribute('href')
        .split('torrentid=')[1];
      const isMusic = torrentAnchor.href.includes('torrents2.php');
      const torrentType = isMusic ? 'Music' : torrentAnchor.textContent;

      const nameAnchor = row.querySelector(
        'td:nth-child(2) > a[href^="/series.php?id="]'
      );
      const name = isMusic ? torrentAnchor.textContent : nameAnchor.textContent;

      const datestring = row
        .querySelector('td:nth-child(4) > span')
        .getAttribute('title');
      const dateval = new Date(datestring).getTime();

      map[torrentID] = {
        name,
        type: torrentType,
        date: dateval,
      };
      return map;
    }, {}),
    lastPage,
  };
}
