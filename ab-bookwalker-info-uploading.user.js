// ==UserScript==
// @name        AB Bookwalker Printed Media Details
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/upload.php
// @grant       none
// @version     1.03
// @author      Marv
// @description Autofills printed media details from Bookwalker
// @grant       GM_xmlhttpRequest
// ==/UserScript==

const anilistGraphQlURL = 'https://graphql.anilist.co';

const lightNovelsTab = document.getElementById('light_novels');
const mangaTab = document.getElementById('manga');

const tabs = [lightNovelsTab, mangaTab];

setUpAutofillForm();

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
    The link should look like: https://bookwalker.jp/de169a9fbd-50ef-43cf-92bf-4e2f4ac7124a/<br />
    <div id="auto_bookwalker"></div>
  </dd>
</div>
`);
    autofillBody.appendChild(bwAutofillForm);

    const autofillButton = bwAutofillForm.querySelector('#bookwalker_autofill_button');
    autofillButton.addEventListener('click', () => {
      autofillBookwalkerInfo(tab);
    });

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

    const anilistAutofillButton = anilistAutofillForm.querySelector('#anilist_autofill_button');
    anilistAutofillButton.addEventListener('click', () => {
      autofillAnilistInfo(tab);
    });
  }
}

/**
 * Autofills the form with information from Bookwalker
 * @param {HTMLElement} tab - The tab to autofill
 * @returns {void}
 */
async function autofillBookwalkerInfo(tab) {
  // Get the URL from the input field
  const autofillURL = tab.querySelector('#bookwalker_autofill').value;
  const autofillDiv = tab.querySelector('#auto_bookwalker');

  // Check if the URL is a valid Bookwalker URL like https://bookwalker.jp/de7c3bf828-1b91-446b-a54a-7f456afa65a0/
  if (!autofillURL.match(/^https?:\/\/bookwalker\.jp\/[a-z0-9\-]{38}\/?$/)) {
    autofillDiv.innerHTML = 'Invalid Bookwalker URL!';
    return;
  }

  autofillDiv.innerHTML = `Getting info from ${autofillURL}...`;

  // Get the info from the URL
  const { title, summary, releaseYear, coverURL } = await getBookwalkerPageInfo(autofillURL);

  autofillDiv.innerHTML = `Got info about ${title}!`;

  submitInput(tab, { jpTitle: title, year: releaseYear, coverURL, summary });

  autofillDiv.innerHTML = `Autofilled info about ${title}!`;
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

    const anilistID = autofillString.match(/\/(\d+)\//)[1];

    autoFillAnilistFromID(tab, anilistID, autofillDiv);
  } else {
    // TODO search and modal to select
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
  const { title, jpTitle, year, tags, coverURL, summary } = await getALPrintedMediaInformation(
    anilistID
  );

  autofillDiv.innerHTML = `Got info about ${title}!`;

  submitInput(tab, { title, jpTitle, year, tags, coverURL, summary });

  autofillDiv.innerHTML = `Autofilled info about ${title}!`;
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
  console.log(inputData);
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
  insertInfo(tagsInput, inputData.tags?.join(', '));
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

  // Get the title
  const titleElem = bookwalkerPage.querySelector('.p-main__title');
  const title = titleElem.textContent.trim();

  // Get the synopsis
  const summaryBodyElement = bookwalkerPage.getElementById('js-summary-collapse-main-product');
  const rawSummary = summaryBodyElement.innerText.trim();
  // Remove excess whitespace from start of lines
  const summary = rawSummary.replace(/^ +/gm, '');

  // Get release date
  const dataLabels = [...bookwalkerPage.querySelector('.p-information__data').children];
  const releaseDateElem =
    dataLabels.find((elem) => elem.innerText == '底本発行日') ??
    dataLabels.find((elem) => elem.innerText == '配信開始日');
  const dateString = releaseDateElem ? releaseDateElem.nextElementSibling.innerText : null;
  const releaseDate = dateString ? new Date(dateString) : null;
  const releaseYear = releaseDate ? releaseDate.getFullYear() : null;

  // Get the cover image
  // Get the content attribute of the meta tag with property "og:image"
  const metaTag = bookwalkerPage.querySelector('meta[property="og:image"]');
  const metaTagContent = metaTag.getAttribute('content');

  // Split the content string by '/' and get the 4th part
  const metaTagContentSplit = metaTagContent.split('/');
  const metaTagContentPart = metaTagContentSplit[3];

  // Reverse the 4th part of the content string
  const metaTagContentPartReversed = metaTagContentPart.split('').reverse().join('');

  // Convert the reversed 4th part of the content string to integer and subtract 1
  const imageNumber = parseInt(metaTagContentPartReversed) - 1;

  // Concatenate all parts to form the final URL
  const coverURL = 'https://c.bookwalker.jp/coverImage_' + imageNumber + '.jpg';

  return {
    title,
    summary,
    releaseYear,
    coverURL,
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
      manga: Page(perPage: 5) {
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
        tags {
          name
        }
        coverImage {
          extraLarge
        }
        description
      }
    }`;

  const variables = {
    id: id,
  };

  const response = await sendALGraphQLRequest(query, variables);

  return {
    title: response.data.Media.title.romaji,
    jpTitle: response.data.Media.title.native,
    year: response.data.Media.startDate.year,
    tags: response.data.Media.tags.map((tag) => tag.name),
    coverURL: response.data.Media.coverImage.extraLarge,
    summary: response.data.Media.description,
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
