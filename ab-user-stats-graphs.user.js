// ==UserScript==
// @name        AB User Stats Graphs
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/user.php*
// @version     1.0
// @author      Marv
// @description Generate graphs for user stats like torrents uploaded.
// @require     https://unpkg.com/micromodal@0.4.10/dist/micromodal.js
// @resource    microModalCSS https://gist.githubusercontent.com/ghosh/4f94cf497d7090359a5c9f81caf60699/raw/d9281f3298b46d9cf991b674bc6e1c1ed14e91cc/micromodal.css
// @grant       GM.addStyle
// @grant       GM.getResourceText
// ==/UserScript==

const ADD_CSS = /* css */ `
.modal__overlay {
  z-index: 99;
}

.modal__container {
  width: 80%;
  max-width: 800px;
  margin: 1.75rem auto;
  z-index: 100;
}
`;

(() => {
  // Add CSS
  GM.addStyle(await GM.getResourceText('microModalCSS'));
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
              <div id="ab-user-stats-graphs-modal-content"></div>
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
