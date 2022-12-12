// ==UserScript==
// @name        AB Torrent Releases Filtering
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/torrents.php*
// @grant       none
// @version     1.3
// @author      -
// @description Filters out torrents based on desired options
// @grant       GM_addStyle
// ==/UserScript==
const addCSS = /* css */ `
.filtersDiv {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.filtersDiv div {
  padding: 0.5em;
}
.filtersDiv input[type="button"] {
  /* button styles */
  font-family: sans-serif;
  font-size: 14px;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: black;
  background: none !important;
  margin: 0.2em;
}

.filtersDiv input[type="button"].selected {
  /* styles for the selected state of the button */
  background: #70dcff !important;
}

.filtersDiv input[type="button"].selected:hover {
  /* styles for the hover state of the button */
  background: #b2ecff !important;
}

.filtersDiv button {
  background-color: #3f51b5;
  color: white;
  border: none;
  border-radius: 2px;
  padding: 3px;
  cursor: pointer;
  width: 45%;
  display: inline-block;
  box-sizing: border-box;
  margin: 0.2em;
  /* round corners */
  -webkit-border-radius: 5px;
}

.filtersDiv button:hover {
  background-color: #5c6bc0;
}

.filtersDiv h3 {
  text-align: center;
  border-bottom: 1px solid #ccc;
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
  completion: ['Ongoing'],
  fileFormat: ['EPUB', 'Archived_Scans'],
};

const optionsHTML = /* html */ `
<div class="box">
  <div class="head">
    <strong>Filters (alt + click to select only one)</strong>
  </div>
  <div class="filtersDiv">
  </div>
</div>
`;

const torrentInfo = {};
const fieldOptions = {};
const buttons = [];

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
    // same for completion, add 'Completed'
    if (fieldOptions.completion) {
      for (const id of Object.keys(torrentInfo)) {
        if (!torrentInfo[id].completion) {
          torrentInfo[id].completion = 'Completed';
          fieldOptions.completion.add('Completed');
        }
      }
    }

    const container = document.createElement('div');
    container.innerHTML = optionsHTML;
    document.querySelector('.torrent_table').before(container);
    const containerBody = container.querySelector('.filtersDiv');

    for (const field of Object.keys(fieldOptions)) {
      const options = Array.from(fieldOptions[field]);
      const fieldDiv = document.createElement('div');
      fieldDiv.id = `userscript-filter-${field}`;

      // Add text header with field name
      const header = document.createElement('h3');
      header.innerText = field;
      fieldDiv.appendChild(header);

      // Add select/deselect all buttons to table
      const selectAllButton = document.createElement('button');
      selectAllButton.innerText = 'Select all';
      selectAllButton.addEventListener('click', () => {
        const parent = selectAllButton.parentElement;
        for (const button of parent.querySelectorAll('input')) {
          button.classList.add('selected');
        }
        updateTorrents();
      });
      fieldDiv.appendChild(selectAllButton);

      const deselectAllButton = document.createElement('button');
      deselectAllButton.innerText = 'Deselect all';
      deselectAllButton.addEventListener('click', () => {
        const parent = deselectAllButton.parentElement;
        for (const button of parent.querySelectorAll('input')) {
          button.classList.remove('selected');
        }
        updateTorrents();
      });
      fieldDiv.appendChild(deselectAllButton);

      // Add checkboxes for each option
      options.forEach((option) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'button';
        checkbox.value = option;
        checkbox.classList.add('selected');

        // on click toggle selected class
        checkbox.addEventListener('click', (event) => {
          // check if alt being held down and if so select it and deselect other options
          if (event.altKey) {
            const parent = checkbox.parentElement;
            for (const button of parent.querySelectorAll('input')) {
              button.classList.remove('selected');
            }
            checkbox.classList.add('selected');
          } else {
            checkbox.classList.toggle('selected');
          }
          updateTorrents();
        });

        // Append checkbox and label to cell and row
        buttons.push(checkbox);
        fieldDiv.appendChild(checkbox);
      });
      containerBody.appendChild(fieldDiv);
    }
  }, 1000);
})();

function updateTorrents() {
  const selectedValues = buttons
    .filter((button) => button.classList.contains('selected'))
    .map((button) => button.value);
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
