// ==UserScript==
// @name        AB User Stats Graphs
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/user.php*
// @version     1.0
// @author      Marv
// @description Generate graphs for user stats like torrents uploaded.
// @require     https://unpkg.com/micromodal@0.4.10/dist/micromodal.js
// @grant       GM.addStyle
// @grant       GM.getResourceText
// ==/UserScript==

const ADD_CSS = /* css */ `
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
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
  width: 80%;
  max-width: 800px;
  margin: 1.75rem auto;
  z-index: 100;
}

.choice-chips {
  display: flex;
  justify-content: space-around;
  padding: 10px;
}

.choice-chips input[type="radio"] {
  display: none;
}

.choice-chips label {
  padding: 10px 20px;
  font-size: 16px;
  border: 2px solid #000;
  border-radius: 25px;
  cursor: pointer;
  transition: background-color 0.3s ease;
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
  font-size: 18px;
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

  // Create modal
  document.body.insertAdjacentHTML(
    'beforeend',
    /* html */ `<div id="ab-user-stats-graphs-modal" class="modal micromodal-slide" aria-hidden="true">
        <div class="modal__overlay" tabindex="-1" data-micromodal-close>
          <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-1-title">
            <header class="modal__header">
              <h2 class="modal__title" id="modal-1-title">User Stats Graphs</h2>
            </header>
            <main class="modal__content" id="modal-1-content">
              <div id="ab-user-stats-graphs-modal-content">
                <div class="choice-chips">
                  <input type="radio" id="uploaded" name="choice" value="Uploaded">
                  <label for="uploaded">Uploaded</label>

                  <input type="radio" id="seeding" name="choice" value="Seeding">
                  <label for="seeding">Seeding</label>

                  <input type="radio" id="leeching" name="choice" value="Leeching">
                  <label for="leeching">Leeching</label>

                  <input type="radio" id="snatched" name="choice" value="Snatched">
                  <label for="snatched">Snatched</label>
                </div>
                <button id="generate-button" class="primary-button">Generate</button>
              </div>
            </main>
          </div>
        </div>
      </div>`
  );

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
