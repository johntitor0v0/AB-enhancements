// ==UserScript==
// @name        AB Torrent Releases Filtering
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/torrents.php
// @grant       none
// @version     1.1
// @author      -
// @description Filters out torrents based on desired options
// @grant       GM_addStyle
// ==/UserScript==
const addCSS = /* css */ `
.filtersDiv {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.filtersDiv table tr:first-child {
  border-bottom: 1px solid #000;
}
.filtersDiv table tr:nth-child(3) {
  border-bottom: 1px solid #000;
  text-align: center;
}
.filtersDiv label {
  margin-left: 0.5em;
}
`;
GM_addStyle(addCSS);

const importantFields = [
  'source',
  'container',
  'codec',
  'resolution',
  'audioCodec',
  'audioChannels',
  'hasJPSubs',
  'translation',
];
const manualFields = {
  ongoing: ['Ongoing'],
  fileFormat: ['EPUB', 'Archived_Scans'],
};

const optionsHTML = /* html */ `
<div class="box">
  <div class="head">
    <strong>Filters</strong>
  </div>
  <div class="filtersDiv">
  </div>
</div>
`;

const torrentInfo = {};
const fieldOptions = {};
const checkboxes = [];

(function () {
  setTimeout(() => {
    const torrentTable = document.querySelector('.torrent_table > tbody');

    const torrents = Array.from(torrentTable.querySelectorAll('tr.group_torrent'));

    // Loop through each torrent row and extract relevant info
    for (const torrent of torrents) {
      const info = torrent.nextElementSibling;
      const titleAnchor = torrent.querySelector('a.userscript-highlight.torrent-page');
      const id = info.id.replace('torrent_', '');
      torrentInfo[id] = {
        infoElem: info,
        torrentRow: torrent,
      };
      for (const field of importantFields) {
        torrentInfo[id][field] = titleAnchor.dataset[field];
        if (!fieldOptions[field]) {
          fieldOptions[field] = new Set();
        }
        fieldOptions[field].add(titleAnchor.dataset[field]);
      }
      // Check if torrent has Japanese subtitles
      const mediaInfoDiv = document.getElementById(`${id}_mediainfo`);
      if (mediaInfoDiv) {
        const subtitlesCaption = [...mediaInfoDiv.querySelectorAll('caption')].find((caption) =>
          caption.textContent.includes('Subtitles')
        );
        if (subtitlesCaption) {
          // convert to string
          torrentInfo[id].hasJPSubs =
            subtitlesCaption.nextElementSibling.textContent.includes('Japanese') + '';
          if (!fieldOptions.hasJPSubs) {
            fieldOptions.hasJPSubs = new Set();
          }
          fieldOptions.hasJPSubs.add(torrentInfo[id].hasJPSubs);
        }
      }

      // Add manual fields
      for (const misc of titleAnchor.dataset['fields']?.split(' ') ?? []) {
        for (const field of Object.keys(manualFields)) {
          if (manualFields[field].includes(misc)) {
            torrentInfo[id][field] = misc;
            if (!fieldOptions[field]) {
              fieldOptions[field] = new Set();
            }
            fieldOptions[field].add(misc);
          }
        }
      }
    }

    console.log(`Found ${torrents.length} torrents`);
    console.log(fieldOptions);
    // remove undefined from each set
    for (const field of importantFields) {
      fieldOptions[field].delete(undefined);
      if (fieldOptions[field].size === 0) {
        delete fieldOptions[field];
      }
    }
    // if there's a translation field, assign translated to all torrents without 'Raw' option
    if (fieldOptions.translation) {
      for (const id of Object.keys(torrentInfo)) {
        if (!torrentInfo[id].translation) {
          torrentInfo[id].translation = 'Translated';
          fieldOptions.translation.add('Translated');
        }
      }
    }

    const container = document.createElement('div');
    container.innerHTML = optionsHTML;
    document.querySelector('.torrent_table').before(container);
    const containerBody = container.querySelector('.filtersDiv');

    for (const field of Object.keys(fieldOptions)) {
      const options = Array.from(fieldOptions[field]);
      const table = document.createElement('table');
      table.id = `userscript-filter-${field}`;

      // Add select/deselect all buttons to table
      const selectAllButton = document.createElement('button');
      selectAllButton.innerText = 'Select all';
      selectAllButton.addEventListener('click', () => {
        const parent = selectAllButton.parentElement;
        for (const checkbox of parent.querySelectorAll('input')) {
          checkbox.checked = true;
        }
        updateTorrents();
      });
      table.appendChild(selectAllButton);

      const deselectAllButton = document.createElement('button');
      deselectAllButton.innerText = 'Deselect all';
      deselectAllButton.addEventListener('click', () => {
        const parent = deselectAllButton.parentElement;
        for (const checkbox of parent.querySelectorAll('input')) {
          checkbox.checked = false;
        }
        updateTorrents();
      });
      table.appendChild(deselectAllButton);

      // Add table header with field name
      const header = document.createElement('tr');
      const headerCell = document.createElement('th');
      headerCell.colSpan = 2;
      headerCell.innerText = field;
      header.appendChild(headerCell);
      table.appendChild(header);
      containerBody.appendChild(table);

      // Add checkboxes for each option
      options.forEach((option) => {
        const row = document.createElement('tr');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.checked = true;
        // Loop through torrents and check for matches
        checkbox.addEventListener('change', () => {
          updateTorrents();
        });
        // Create cell and label elements for checkbox
        const cell = document.createElement('td');
        const label = document.createElement('label');
        label.innerText = option;
        label.htmlFor = checkbox.id;

        // Append checkbox and label to cell and row
        cell.appendChild(checkbox);
        cell.appendChild(label);
        row.appendChild(cell);
        table.appendChild(row);
        checkboxes.push(checkbox);
      });
    }
  }, 1000);
})();

function updateTorrents() {
  const selectedValues = checkboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  for (const id in torrentInfo) {
    const torrent = torrentInfo[id];
    const isMatch = Object.keys(fieldOptions).every((field) =>
      selectedValues.includes(torrent[field])
    );
    torrent.torrentRow.classList.toggle('hide', !isMatch);
    if (!isMatch) {
      torrent.infoElem.classList.toggle('hide', !isMatch);
    }
  }
}
