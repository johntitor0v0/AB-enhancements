// ==UserScript==
// @name        AB Better Upload Page
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/upload.php
// @version     1.1.3
// @author      Marv
// @icon        https://avatars.githubusercontent.com/u/17340496
// @description Improves styling and functionality of the AB upload page
// @grant       GM_addStyle
// ==/UserScript==

const EXCLUDE_OPTIONS = ['', '---'];

const ADD_CSS = /* css */ `
/* Checkbox bigger */
input[type="checkbox"] {
  width: 2rem;
  height: 2rem;
}
input[type="checkbox"]:hover {
  cursor: pointer;
}

/* Input Box taller */
input[type="text"] {
  height: 1.5rem;
  padding: 0.25rem;
  font-size: 1rem;
  max-width: 100%;
}

/* checkbox flex div */
.checkbox-flex-div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* Buttons */
input[type="button"],input[type="submit"] {
  background: #555;
  font-weight: bold;
}

/* File selector */
input[type="file"] {
  padding: 12px 20px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f8f8;
  cursor: pointer;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

input[type="file"]:hover {
  border-color: #888;
  background-color: #e8e8e8;
}

input[type="file"]:focus {
  outline: none;
  border-color: #666;
  background-color: #fff;
}

input[type="file"]::file-selector-button {
  font-weight: bold;
  color: #fff;
  background-color: #555;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  margin-right: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

input[type="file"]::file-selector-button:hover {
  background-color: #555;
}

input[type="file"]:drop {
  border-color: #4caf50;
  background-color: #e8f5e9;
}

/* Container styles */
.chip-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

/* Chip styles */
.chip {
  background-color: white;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border: 1px solid #ccc;
  text-align: center;
  font-weight: 600;
}

/* Hover effect */
.chip:hover {
  background-color: #eeeeee;
}

/* Selected chip */
.chip.selected {
  background-color: #555;
  color: white;
}

/* Multi Torrent Upload */
.multi-torrent-upload-container {
  width: max-content;
  padding: 20px;
  box-sizing: border-box;
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 8px;
  cursor: pointer;
}

.multi-torrent-input {
  display: none;
}

.multi-torrent-upload-button {
  display: inline-block;
  padding: 10px 20px;
  background-color: #007bff;
  color: #fff;
  text-align: center;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.multi-torrent-upload-button:hover {
  background-color: #0056b3;
}
`;

(() => {
  GM_addStyle(ADD_CSS);

  fixCheckboxStyles();
  convertSelectsToInputChips();
  makeInputsExpand();
  setUpMultiTorrentUpload();
})();

/**
 * Sets up the multi-torrent upload functionality
 * It adds a new file input that accepts multiple files
 * If the user selects multiple files, it will open a new tab for each file
 */
function setUpMultiTorrentUpload() {
  const inputs = [...document.querySelectorAll('input[name="file_input"]')];
  for (const input of inputs) {
    // Set up input
    const originalInputId = input.id;

    // Type of upload id
    const tab = originalInputId.split('file_input_')[1];

    const inputHTML = /* html */ `
    <div class="multi-torrent-upload-container">
      <input type="file" class="multi-torrent-input" id="multi-torrent-input-${tab}" multiple data-original-input-id="${originalInputId}" />
      <div class="multi-torrent-upload-button">Multi Torrent Upload (up to 20 a time because of the site ratelimit)</div>
    </div>
    `;
    input.insertAdjacentHTML('afterend', inputHTML);

    /**
     * @type {HTMLInputElement}
     */
    const multiInput = document.getElementById('multi-torrent-input-' + tab);
    multiInput.parentElement.addEventListener('click', () => {
      multiInput.click();
    });

    multiInput.addEventListener('change', async (event) => {
      /**
       * @type {FileList}
       */
      const files = event.target.files;
      // wait 100ms for the files to be added to the input
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (const file of files) {
        const newTab = window.open(`https://animebytes.tv/upload.php#${tab}`);
        console.log('New tab opened for file:', file.name);
        newTab.addEventListener('load', () => {
          /**
           * @type {HTMLInputElement}
           */
          const filePicker = newTab.document.getElementById(originalInputId);
          const newFiles = new DataTransfer();
          newFiles.items.add(file);
          filePicker.files = newFiles.files;
          filePicker.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('File added to new tab:', file.name);
        });
      }
    });
  }
}

/**
 * Makes the input boxes expand when the text is too long
 */
function makeInputsExpand() {
  const inputs = [...document.querySelectorAll('input[type="text"]')];
  for (const input of inputs) {
    const resize = () => {
      input.style.width = 'auto';
      input.style.width = `${input.scrollWidth}px`;
    };
    resize();
    input.addEventListener('input', resize);
    input.addEventListener('change', resize);
    input.addEventListener('focus', resize);
    setInterval(resize, 200);
  }
  console.log('Inputs expanded');
}

/**
 * Converts the selects to input chips by hiding the select and adding a chip for each option that is selected
 */
function convertSelectsToInputChips() {
  const selects = [...document.querySelectorAll('select')];
  for (const select of selects) {
    select.style.display = 'none';

    const input = select.nextElementSibling;

    const parent = select.parentElement;
    const chipContainer = document.createElement('div');
    chipContainer.className = 'chip-container';
    parent.prepend(chipContainer);

    const options = [...select.options];
    for (const option of options) {
      if (EXCLUDE_OPTIONS.includes(option.textContent)) {
        continue;
      }
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = option.textContent;

      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        toggleInputValue(input, option.value);
      });

      chipContainer.appendChild(chip);
    }
  }
}

/**
 *
 * @param {HTMLInputElement} input
 * @param {string} value
 */
function toggleInputValue(input, value) {
  const values = input.value
    .split(',')
    .filter(Boolean)
    .map((v) => v.trim());
  console.log(values);
  if (values.includes(value)) {
    input.value = values.filter((v) => v !== value).join(',');
  } else {
    input.value = [...values, value].join(', ');
  }
}

/**
 * Fixes the vertical centering of the text nodes after the checkboxes and makes the whole div clickable
 */
function fixCheckboxStyles() {
  const checkboxes = [...document.querySelectorAll('input[type="checkbox"]')];
  for (const checkbox of checkboxes) {
    const parentDD = checkbox.parentElement;
    const stuffToCenter = [...parentDD.childNodes].filter(
      (el) => el.tagName !== 'DIV'
    );
    // Put it in a flex div and center it vertically
    const flexDiv = document.createElement('div');
    flexDiv.className = 'checkbox-flex-div';
    for (const el of stuffToCenter) {
      flexDiv.appendChild(el);
    }
    // Append at the front of the parent
    parentDD.prepend(flexDiv);

    flexDiv.addEventListener('click', (event) => {
      if (event.target !== checkbox) {
        checkbox.click();
      }
    });
  }
}
