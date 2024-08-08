// ==UserScript==
// @name        AB Auto Dark Theme
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/*
// @version     1.0.0
// @author      Marv
// @icon        https://avatars.githubusercontent.com/u/17340496
// @description Automatically adjusts AB's theme to match the user system theme.
// @grant       none
// @run-at      document-start
// ==/UserScript==

/**
 * @type {Object<string, {link: string, selector: string}>}
 */
const themes = {
  light: {
    link: '/static/css/tentacletastic/style-8bc2009cc5.css',
    selector: 'link[rel="stylesheet"][href*="tentacletastic/style"]',
  },
  dark: {
    link: '/static/css/coalbytes/style-84dd3a480b.css',
    selector: 'link[rel="stylesheet"][href*="coalbytes/style"]',
  },
};

const userPrefersDarkTheme = window.matchMedia(
  '(prefers-color-scheme: dark)'
).matches;

const head = document.head;
// Add proper style sheet
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = themes[userPrefersDarkTheme ? 'dark' : 'light'].link;
link.media = 'screen';
head.appendChild(link);

const themeNotPreferredByUser = userPrefersDarkTheme ? 'light' : 'dark';
// Delete existing style sheet
const currentSheet = document.querySelector(
  themes[themeNotPreferredByUser].selector
);
currentSheet && head.removeChild(currentSheet);
