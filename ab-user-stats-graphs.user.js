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
          </main>
        </div>
      </div>`
  );

  // Generate graph
  document.getElementById('generate-button').addEventListener('click', () => {
    const choice = document.querySelector('input[name="choice"]:checked').value.toLowerCase();

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
