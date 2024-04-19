// ==UserScript==
// @name        AB Better Upload Page
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/upload.php
// @version     1.0.0
// @author      Marv
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
}

/* checkbox flex div */
.checkbox-flex-div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Container styles */
.chip-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

/* Chip styles */
.chip {
  background-color: white;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border: 1px solid #ccc;
  text-align: center;
}

/* Hover effect */
.chip:hover {
  background-color: #e0e0e0;
}

/* Selected chip */
.chip.selected {
  background-color: lightpink;
  color: darkred;
  border: 1px solid lightcoral;
}
`;

(() => {
  GM_addStyle(ADD_CSS);

  fixCheckboxStyles();
  convertSelectsToInputChips();
})();

/**
 * Converts the selects to input chips by hiding the select and adding a chip for each option that is selected
 */
function convertSelectsToInputChips() {
  const selects = [...document.querySelectorAll('select')];
  for (const select of selects) {
    select.style.display = 'none';

    const parent = select.parentElement;
    const chipContainer = document.createElement('div');
    chipContainer.className = 'chip-container';
    parent.appendChild(chipContainer);

    const options = [...select.options];
    for (const option of options) {
      if (EXCLUDE_OPTIONS.includes(option.textContent)) {
        continue;
      }
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = option.textContent;

      chip.addEventListener('click', () => {
        option.selected = !option.selected;
        select.onchange();
        chip.classList.toggle('selected');
        const otherChips = [...chipContainer.querySelectorAll('.chip')];
        for (const otherChip of otherChips) {
          if (otherChip !== chip) {
            otherChip.classList.remove('selected');
          }
        }
      });

      chipContainer.appendChild(chip);
    }
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
