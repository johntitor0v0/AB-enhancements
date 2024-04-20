// ==UserScript==
// @name        AB Autofill Printed Media Details
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/upload.php
// @version     1.4.9
// @author      Marv
// @description Autofills printed media details from Bookwalker
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @resource    modalStyling https://gist.githubusercontent.com/ghosh/4f94cf497d7090359a5c9f81caf60699/raw/d9281f3298b46d9cf991b674bc6e1c1ed14e91cc/micromodal.css
// @require     https://unpkg.com/micromodal@0.4.10/dist/micromodal.min.js
// ==/UserScript==

const anilistGraphQlURL = 'https://graphql.anilist.co';
const MAX_RESULTS = 10;

const lightNovelsTab = document.getElementById('light_novels');
const mangaTab = document.getElementById('manga');

const tabs = [lightNovelsTab, mangaTab];

const addCSS = /* css */ `
/* Feedback stuff */

#auto_bookwalker, #auto_anilist {
  font-size: 1.25rem;
  margin-top: 1rem;
  line-height: 1.5;
}

/* mostly stolen from Anilist with adjustments for modal stuff */
:root {
  --color-overlay: 49,31,47;
  --color-background: 11,22,34;
  --color-foreground: 21,31,46;
}
.modal {
  position: absolute !important;
  z-index: 1000;
  font-family: Noto Sans JP,Noto Sans,Roboto,-apple-system,BlinkMacSystemFont,Segoe UI,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif !important;
}
.modal__container {
  max-width: 1500px !important;
  width: 85% !important;
  background-color: rgb(var(--color-background)) !important;
  z-index: 2000 !important;
}
.modal__title {
  color: white !important;
}

#booksModal-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, 230px);
  grid-template-rows: repeat(auto-fill, 322px);
  grid-gap: 30px;
  justify-content: center;
}

.anilistResult {
  border-radius: 3px;
  box-shadow: 0 2px 20px rgba(49,54,68,.2);
  display: inline-block;
  font-size: 1.15rem;
  height: 322px;
  position: relative;
}
.anilistResult:hover {
  box-shadow: 0 2px 20px white;
  cursor: pointer;
}

.anilistImage {
  border-radius: 3px;
  height: 100%;
  left: 0;
  position: absolute;
  object-fit: cover;
  top: 0;
  width: 100%;
  z-index: 0;
}

.anilistTitle {
  background: rgba(var(--color-overlay),.8);
  border-radius: 0 0 3px 3px;
  bottom: 0;
  box-sizing: border-box;
  left: 0;
  padding: 12px;
  position: absolute;
  width: 100%;
  z-index: 2;
  word-break: break-word;
  color: white;
}
`;

(function () {
  'use strict';

  GM_addStyle(addCSS);
  setUpAutofillForm();
  setUpWatchTorrentInput();
})();

function setUpWatchTorrentInput() {
  const torrentInputs = [
    document.getElementById('file_input_light_novels'),
    document.getElementById('file_input_manga'),
  ];
  torrentInputs.forEach((torrentInput) => {
    torrentInput.addEventListener('change', () => {
      const fileName = torrentInput.files[0].name;
      const torrentName = fileName.replace(/\.[^/.]+$/, '');

      // Clean out .epub, .zip, .cbz from end of filename
      let cleanName = torrentName.replace(/\.(epub|zip|cbz)$/i, '');

      const removeRegexes = [/【FANZA限定版】$/];
      for (const regex of removeRegexes) {
        cleanName = cleanName.replace(regex, '');
      }

      console.log('Torrent name:', torrentName);

      const inputs = [
        ...document.querySelectorAll('#bookwalker_autofill, #anilist_autofill'),
      ];

      inputs.forEach((input) => {
        input.value = cleanName;
      });

      console.log('Autofilled from torrent name:', cleanName);
    });
  });
}

/**
 * Adds new autofill options to the upload form
 * @returns {void}
 */
function setUpAutofillForm() {
  for (const tab of tabs) {
    const autofillSection = tab.querySelector('#autofill');
    const autofillBody = autofillSection.querySelector('.box');

    // Add bookwalker autofill form
    const bwAutofillForm = createElementFromHTML(/* html */ `
<div>
  <dt>Bookwalker Autofill</dt>
  <dd>
    <input type="text" id="bookwalker_autofill" size="50" value="" />
    <input type="button" onclick="" id="bookwalker_autofill_button" value="Autofill!" /><br />
    You can enter a valid bookwalker URL or type in a title to search. <br />
    Example URLs: https://bookwalker.jp/de169a9fbd-50ef-43cf-92bf-4e2f4ac7124a/<br />
    https://bookwalker.jp/series/67415/list/<br />
    <div id="auto_bookwalker"></div>
  </dd>
</div>
`);
    autofillBody.appendChild(bwAutofillForm);

    const autofillButton = bwAutofillForm.querySelector(
      '#bookwalker_autofill_button'
    );
    autofillButton.addEventListener('click', () => autofillBookwalkerInfo(tab));

    const anilistAutofillForm = createElementFromHTML(/* html */ `
<div>
  <dt>Anilist Autofill</dt>
  <dd>
    <input type="text" id="anilist_autofill" size="50" value="" />
    <input type="button" onclick="" id="anilist_autofill_button" value="Autofill!" /><br />
    You can either enter an Anilist manga/LN link or type in a title to search.<br />
    Example valid URLs: https://anilist.co/manga/114920/<br />
    https://anilist.co/anime/21355/ReZero-kara-Hajimeru-Isekai-Seikatsu<br />
    <div id="auto_anilist"></div>
  </dd>
</div>
`);

    autofillBody.appendChild(anilistAutofillForm);

    const anilistAutofillButton = anilistAutofillForm.querySelector(
      '#anilist_autofill_button'
    );
    anilistAutofillButton.addEventListener('click', () =>
      autofillAnilistInfo(tab)
    );
  }
  console.log('Autofill form set up');
  setUpModal();
}

function setUpModal() {
  const modalCSS = GM_getResourceText('modalStyling');
  GM_addStyle(modalCSS);
  // Set up modal for later
  document.body.insertAdjacentHTML(
    'beforeend' /* html */,
    `
<div class="modal micromodal-slide" id="booksModal" aria-hidden="true">
  <div class="modal__overlay" tabindex="-1" data-micromodal-close>
    <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="booksModal-title">
      <header class="modal__header">
        <h2 class="modal__title" id="booksModal-title">
          <!-- Add title -->
        </h2>
        <button class="modal__close" aria-label="Close modal" data-micromodal-close></button>
      </header>
      <main class="modal__content" id="booksModal-content">
        <!-- Add content -->
      </main>
    </div>
  </div>
</div>;
`
  );

  MicroModal.init();

  console.log('Modal set up');
}

/**
 * Autofills the form with information from Bookwalker
 * @param {HTMLElement} tab - The tab to autofill
 * @returns {void}
 */
async function autofillBookwalkerInfo(tab) {
  const formInput = tab.querySelector('#bookwalker_autofill').value;
  const autofillDiv = tab.querySelector('#auto_bookwalker');
  autofillDiv.innerHTML = 'Getting info...';

  const { volumeURL, title } = await getVolumeURLAndTitle(formInput);
  if (!volumeURL) {
    const results = await searchBookwalker(formInput);
    // Show modal to choose proper title
    autofillDiv.innerHTML = `Found ${results.length} results for ${formInput}!`;

    if (results.length < 1) {
      autofillDiv.innerHTML = `No results found for ${formInput}!`;
      return;
    }

    const modalTitle = document.querySelector('#booksModal-title');
    const modalContent = document.querySelector('#booksModal-content');

    modalTitle.innerHTML = `Select a result for ${formInput}`;

    // Display clickable image covers in modal content to select the proper title/ID
    // Use loadExternalImage to load the base64 image data
    let modalContentHTML = '';
    for (const result of results) {
      modalContentHTML += `
    <div class="anilistResult" data-id="${result.title}">
      <a href="${result.url}" target="_blank" onclick="event.preventDefault();">
        <img class="anilistImage" />
      </a>
      <div class="anilistTitle">${result.title}</div>
    </div>
    `;
    }
    modalContent.innerHTML = modalContentHTML;

    for (const result of results) {
      const resultDiv = document.querySelector(`[data-id="${result.title}"]`);
      const image = document.querySelector(
        `[data-id="${result.title}"] .anilistImage`
      );
      loadExternalImage(result.imageUrl, (dataURL) => {
        image.src = dataURL;
      });
      resultDiv.addEventListener('click', async () => {
        MicroModal.close('booksModal');
        console.log(`Autofilling from Bookwalker URL ${result.url}...`);
        autofillDiv.innerHTML = `Autofilling from Bookwalker URL ${result.url}...`;
        const { volumeURL, title } = await getVolumeURLAndTitle(result.url);
        autofillFromBookwalkerURL(tab, volumeURL, autofillDiv, title);
      });
    }

    MicroModal.show('booksModal');
    return;
  }

  autofillDiv.innerHTML = `Getting info from ${volumeURL}...`;
  autofillFromBookwalkerURL(tab, volumeURL, autofillDiv, title);
}

/**
 * Searches Bookwalker for books based on the provided query.
 * @param {string} query - The search query.
 * @returns {Promise<Array<{title: string, url: string, imageUrl: string}>>} - An array of objects containing the title, URL, and cover image URL of each result.
 */
async function searchBookwalker(query) {
  const BW_SEARCH_URL = 'https://bookwalker.jp/search/?word=';
  const searchURL = BW_SEARCH_URL + encodeURIComponent(query);
  const doc = await getDocumentFromURL(searchURL);
  const resultsSection = doc.querySelector('section.o-contents-section');
  const results = resultsSection.querySelectorAll('li.m-tile');
  return [...results].map((book) => {
    const titleAnchor = book.querySelector('p.m-book-item__title > a');
    return {
      title: titleAnchor.title,
      url: titleAnchor.href,
      imageUrl: book.querySelector('div.m-thumb img').dataset.original,
    };
  });
}

/**
 * Retrieves the volume URL and title from the input field
 * @param {string} formInput - The input from the form
 * @returns {Promise<{volumeURL: string, title: string}>} An object containing the volume URL and title
 */
async function getVolumeURLAndTitle(formInput) {
  let volumeURL = '';
  let title = '';

  // Check if the URL is a valid Bookwalker URL like https://bookwalker.jp/de7c3bf828-1b91-446b-a54a-7f456afa65a0/
  if (formInput.match(/^https?:\/\/bookwalker\.jp\/[a-z0-9\-]{38}\/?$/)) {
    volumeURL = formInput;
  }
  // Else check if matches series like https://bookwalker.jp/series/225244/list/
  else if (
    formInput.match(/^https?:\/\/bookwalker\.jp\/series\/\d+\/list\/?$/)
  ) {
    const data = await getBookwalkerSeriesInfo(formInput);
    volumeURL = data.books[0];
    title = data.title;
  }

  return { volumeURL, title };
}

/**
 * Autofills the form with information from Bookwalker given a volume URL
 * @param {HTMLElement} tab
 * @param {string} volumeURL
 * @param {HTMLDivElement} autofillDiv
 * @param {string} title
 * @returns
 */
async function autofillFromBookwalkerURL(
  tab,
  volumeURL,
  autofillDiv,
  title = null
) {
  // Get the info from the URL
  const volumeData = await getBookwalkerPageInfo(volumeURL);
  if (volumeData === null) {
    autofillDiv.innerHTML = 'Invalid URL!';
    return;
  }
  title = volumeData.title || title;
  const { releaseYear, coverURL, summary, reading } = volumeData;

  autofillDiv.innerHTML = `Got info about ${title}!`;

  submitInput(tab, { jpTitle: title, year: releaseYear, coverURL, summary });

  autofillDiv.innerHTML = `Autofilled info about <a href="${volumeURL}">${title}</a>
  <br>Reading: ${reading}
  <br>${volumeData.authorInfo}
  <br>This title first released <span style="color: red;">${volumeData.dateString}</span>!`;
}

/** Autofills the form with information from Anilist given a search term or URL
 * @param {HTMLElement} tab - The tab to autofill
 * @returns {void}
 */
async function autofillAnilistInfo(tab) {
  const autofillString = tab.querySelector('#anilist_autofill').value;
  const autofillDiv = tab.querySelector('#auto_anilist');

  // Check if the string is an anilist URL or a search term
  if (autofillString.match(/^https?:\/\/anilist\.co\/(manga|anime)\/\d+.*$/)) {
    autofillDiv.innerHTML = `Getting info from ${autofillString}...`;

    const anilistID = autofillString.match(/manga\/(\d+)\b/)[1];

    autoFillAnilistFromID(tab, anilistID, autofillDiv);
  } else {
    const currentType = tab === lightNovelsTab ? 'NOVEL' : 'MANGA';

    autofillDiv.innerHTML = `Searching for ${autofillString}...`;

    const results = await searchALMedia(autofillString, currentType);

    if (results.length < 1) {
      autofillDiv.innerHTML = `No results found for ${autofillString}!`;
      return;
    }
    if (results.length === 1) {
      autofillDiv.innerHTML = `Found 1 result for ${autofillString}!`;
      autoFillAnilistFromID(tab, results[0].id, autofillDiv);
      return;
    }
    if (results.length > 1) {
      // Show modal to choose proper title
      autofillDiv.innerHTML = `Found ${results.length} results for ${autofillString}!`;

      const modalTitle = document.querySelector('#booksModal-title');
      const modalContent = document.querySelector('#booksModal-content');

      modalTitle.innerHTML = `Select a result for ${autofillString}`;

      // Display clickable image covers in modal content to select the proper title/ID
      // Use loadExternalImage to load the base64 image data from Anilist
      let modalContentHTML = '';
      for (const result of results) {
        modalContentHTML += `
<div class="anilistResult" data-id="${result.id}">
  <img class="anilistImage" />
  <div class="anilistTitle">${result.title.romaji}</div>
</div>
`;
      }
      modalContent.innerHTML = modalContentHTML;

      for (const result of results) {
        const resultDiv = document.querySelector(`[data-id="${result.id}"]`);
        const image = document.querySelector(
          `[data-id="${result.id}"] .anilistImage`
        );
        loadExternalImage(result.coverImage.large, (dataURL) => {
          image.src = dataURL;
        });
        resultDiv.addEventListener('click', () => {
          console.log(`Autofilling from Anilist ID ${result.id}...`);
          autoFillAnilistFromID(tab, result.id, autofillDiv);
          MicroModal.close('booksModal');
        });
      }

      MicroModal.show('booksModal');
    }
  }
}

/** Autofills the form given an Anilist ID
 * @param {HTMLElement} tab - The tab to autofill
 * @param {number} anilistID - The ID of the Anilist entry
 * @param {HTMLElement} autofillDiv - The div to display autofill messages
 * @returns {void}
 */
async function autoFillAnilistFromID(tab, anilistID, autofillDiv) {
  // Get the info from the URL
  const { title, jpTitle, year, tags, coverURL, summary, status } =
    await getALPrintedMediaInformation(anilistID);

  autofillDiv.innerHTML = `Got info about ${title}!`;

  submitInput(tab, { title, jpTitle, year, tags, coverURL, summary });

  autofillDiv.innerHTML = `Autofilled info about <a href="https://anilist.co/manga/${anilistID}">${title}</a>
${title}!`;
  if (status)
    autofillDiv.innerHTML += `<br>This series is <span style="color: red;">${status}</span>!`;
}

/**
 * Submits the input data to the form
 * @param {HTMLElement} tab - The tab to autofill
 * @param {Object} inputData - The data to insert into the form
 * @returns {void}
 * @property {string} inputData.title - The Romaji title of the series
 * @property {string} inputData.jpTitle - The Japanese title of the series
 * @property {string} inputData.year - The year the series was released
 * @property {string[]} inputData.tags - The tags of the series
 * @property {string} inputData.coverURL - The URL of the cover image
 * @property {string} inputData.summary - The summary of the series
 */
function submitInput(tab, inputData) {
  console.log('inputting', inputData);

  const inputTagString = inputData.tags
    ?.join(',')
    .replace(/ /g, '.')
    .toLowerCase();
  // Get the relevant elements to find the input fields to insert the info
  const groupInformationDiv = tab.querySelector('#group_information');
  const groupInformationBody = groupInformationDiv.querySelector('.box');

  const seriesNameDt = [...groupInformationBody.querySelectorAll('dt')].find(
    (dt) => dt.textContent.trim() === 'Series Name'
  );
  const romajiSeriesDd = seriesNameDt.nextElementSibling;
  const jpSeriesDd = seriesNameDt.nextElementSibling.nextElementSibling;
  const romajiSeriesInput = romajiSeriesDd.querySelector('input');
  const jpSeriesInput = jpSeriesDd.querySelector('input');

  const yearDt = [...groupInformationBody.querySelectorAll('dt')].find(
    (dt) => dt.textContent.trim() === 'Year'
  );
  const yearDd = yearDt.nextElementSibling;
  const yearInput = yearDd.querySelector('input');

  const tagsDt = [...groupInformationBody.querySelectorAll('dt')].find(
    (dt) => dt.textContent.trim() === 'Tags'
  );
  const tagsDd = tagsDt.nextElementSibling;
  const tagsInput = tagsDd.querySelector('input');

  const coverDt = [...groupInformationBody.querySelectorAll('dt')].find(
    (dt) => dt.textContent.trim() === 'Image'
  );
  const coverDd = coverDt.nextElementSibling;
  const coverInput = coverDd.querySelector('input');

  const summaryDt = [...groupInformationBody.querySelectorAll('dt')].find(
    (dt) => dt.textContent.trim() === 'Series Description'
  );
  const summaryDd = summaryDt.nextElementSibling;
  const summaryInput = summaryDd.querySelector('textarea');

  // Insert the info into the input fields, check if the info exists and if the field is empty
  const insertInfo = (input, info) => {
    if (info && !input.value) {
      input.value = info;
    }
  };
  insertInfo(romajiSeriesInput, inputData.title);
  insertInfo(jpSeriesInput, inputData.jpTitle);
  insertInfo(yearInput, inputData.year);
  insertInfo(tagsInput, inputTagString);
  insertInfo(coverInput, inputData.coverURL);
  insertInfo(summaryInput, inputData.summary);
}

/**
 * Retrieves information about a Bookwalker page specified by its URL
 * @param {string} url - The URL of the Bookwalker page
 * @returns {Object} An object containing the following information:
 * - title: string, the title of the book
 * - summary: string, the synopsis of the book
 * - releaseYear: number, the year the book was released
 * - coverURL: string, the URL of the book cover image
 */
async function getBookwalkerPageInfo(url) {
  // Get the HTML of the page
  const bookwalkerPage = await getDocumentFromURL(url);

  // // Get the title
  // const titleElem = bookwalkerPage.querySelector('.p-main__title');
  // const title = titleElem.textContent.trim();
  let title = '';
  let reading = '';

  // Get the synopsis
  const summaryBodyElement = bookwalkerPage.getElementById(
    'js-summary-collapse-main-product'
  );
  const rawSummary = summaryBodyElement.innerText.trim();
  // Remove excess whitespace from start of lines
  const summary = rawSummary.replace(/^ +/gm, '');

  // Get release date
  const dataLabels = [
    ...bookwalkerPage.querySelector('.p-information__data').children,
  ];
  const releaseDateElem =
    dataLabels.find((elem) => elem.innerText == '底本発行日') ??
    dataLabels.find((elem) => elem.innerText == '配信開始日');
  const dateString = releaseDateElem
    ? releaseDateElem.nextElementSibling.innerText
    : null;
  const releaseDate = dateString ? new Date(dateString) : null;
  const releaseYear = releaseDate ? releaseDate.getFullYear() : null;

  // Get the cover image
  let coverURL = '';
  // Get slug from url
  // Ex. https://bookwalker.jp/decc703038-3d4b-436c-9eab-0a9fffcad894/
  const slug = url.split('bookwalker.jp/')[1].split('/')[0];

  // Check if slug starts with de and strip it
  if (slug.startsWith('de')) {
    const UUID = slug.slice(2);
    const APIUrl = `https://member-app.bookwalker.jp/api/books/updates?fileType=EPUB&${UUID}=0`;
    try {
      const data = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: APIUrl,
          onload: function (response) {
            if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              resolve(data);
            } else {
              reject(
                new Error(`Request failed with status ${response.status}`)
              );
            }
          },
          onerror: reject,
        });
      });
      if (data.length <= 0) {
        throw new Error(`No data found for URL ${APIUrl}`);
      }
      coverURL = data[0].coverImageUrl;
      title = data[0].productName;
      reading = data[0].productNameKana;
    } catch (error) {
      console.error(error);
    }
  }

  const authorInfo = [...bookwalkerPage.querySelector('.p-author').children]
    .map((elem) => elem.innerText.trim())
    .join('; ');

  return {
    title,
    summary,
    releaseYear,
    dateString,
    coverURL,
    reading,
    authorInfo,
  };
}

/**
 * Given a bookwalker series page, return information about the titles and URLs of the books in the series
 * @param {string} url
 * @returns {Promise<Object[]>} An object containing:
 * - title: string, the series title
 * - books: string[], an array of URLs to the books in the series in order of release
 */
async function getBookwalkerSeriesInfo(url) {
  const doc = await getDocumentFromURL(url);
  let bookURLs = [];
  const title = doc
    .querySelector('meta[property="og:description"]')
    .content.split('、')[0];

  [
    ...doc.querySelector('.o-contents-section__body .m-tile-list').children,
  ].forEach((book) => {
    let em = book.querySelector('p a[href].m-book-item__title');
    // Return if no title link
    if (!em) return;
    // Return if no add to cart (to filter out tokutens and stuff)
    if (!book.querySelector('.a-icon-btn--cart')) return;
    bookURLs.unshift(em.href);
  });

  return {
    title,
    books: bookURLs,
  };
}

/**
 * Creates an element from an HTML string
 * @param {string} htmlString
 * @returns {Element}
 */
function createElementFromHTML(htmlString) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

/**
 * Gets the document from a URL using GM_xmlhttpRequest to access other domains
 * @param {string} url
 * @returns {Promise<Document>}
 */
async function getDocumentFromURL(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function (response) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.responseText, 'text/html');
        resolve(doc);
      },
      onerror: function (error) {
        reject(error);
      },
    });
  });
}

/**
 * Searches a string to get a list of IDs, titles, and cover URLs from the AniList API.
 * @param {string} search - The search string to use.
 * @param {string} type - The type of media to search for. Can be MANGA or NOVEL.
 * @return {Object[]} - An array of objects containing the ID, title, and cover URL of each result.
 */
async function searchALMedia(search, type) {
  const query = `
    query ($search: String, $format: MediaFormat) {
      manga: Page(perPage: ${MAX_RESULTS}) {
        results: media(type: MANGA, search: $search, format: $format) {
          id
          title {
            native
            romaji
          }
          coverImage {
            large
          }
        }
      }
    }`;

  const variables = {
    search: search,
    format: type,
  };

  const response = await sendALGraphQLRequest(query, variables);
  const results = response.data.manga.results;
  return results;
}

/**
 * Retrieve information about a manga using its ID from the AniList API.
 * @param {Number} id - The ID of the manga.
 * @return {Object} - An object containing the title, Japanese title, year, tags, cover URL, and summary of the manga.
 */
async function getALPrintedMediaInformation(id) {
  const query = `
    query ($id: Int) { 
      Media (id: $id, type: MANGA) { 
        id
        title {
          romaji
          native
        }
        startDate {
          year
        }
        genres
        tags {
          name
        }
        coverImage {
          extraLarge
        }
        description
        status
      }
    }`;

  const variables = {
    id: id,
  };

  const response = await sendALGraphQLRequest(query, variables);

  const dummyElem = document.createElement('div');
  dummyElem.innerHTML = response.data.Media.description;
  const cleanSummary = dummyElem.textContent;

  return {
    title: response.data.Media.title.romaji,
    jpTitle: response.data.Media.title.native,
    year: response.data.Media.startDate.year,
    tags: [
      ...response.data.Media.genres,
      ...response.data.Media.tags.map((tag) => tag.name),
    ],
    coverURL: response.data.Media.coverImage.extraLarge,
    summary: cleanSummary,
    status: response.data.Media.status,
  };
}

/**
 * Sends a GraphQL API request to Anilist using GM_xmlhttpRequest
 * @param {string} query - The GraphQL query string
 * @param {object} variables - The variables to be used in the query
 * @param {string} url - The URL of the GraphQL API endpoint
 * @return {object} The API response in JSON format
 */
async function sendALGraphQLRequest(query, variables, url = anilistGraphQlURL) {
  // Define the config for our API request
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: JSON.stringify({
      query: query,
      variables: variables,
    }),
  };

  // Return a promise that resolves to the API response
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: options.method,
      url: url,
      headers: options.headers,
      data: options.data,
      onload: function (response) {
        const data = JSON.parse(response.responseText);
        if (response.status === 200) {
          resolve(data);
        } else {
          reject(data);
        }
      },
    });
  });
}

/**
 * Loads an external image from a given URL.
 * @param {string} url - The URL of the image to be loaded.
 * @param {function} callback - The callback function to be called when the image is loaded. The function returns the data URL of the image.
 */
function loadExternalImage(url, callback) {
  GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    responseType: 'arraybuffer',
    onload: function (response) {
      // Convert the response to base64
      const base64 = btoa(
        new Uint8Array(response.response).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // Create a data URL from the base64 depending on the image type
      const isPng = url.endsWith('.png');
      const dataURL =
        'data:image/' + (isPng ? 'png' : 'jpeg') + ';base64,' + base64;

      // Call the callback function
      callback(dataURL);
    },
  });
}
