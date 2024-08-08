// ==UserScript==
// @name        AB Auto Dark Theme
// @namespace   https://github.com/MarvNC
// @match       https://animebytes.tv/*
// @version     1.1.0
// @author      Marv
// @icon        https://avatars.githubusercontent.com/u/17340496
// @description Automatically adjusts AB's theme to match the user system theme.
// @grant       none
// ==/UserScript==

const settingsTabUrl = 'https://animebytes.tv/user.php?action=edit';

/**
 * @type {Object<string, {link: string, selector: string, selectIndex: number}>}
 */
const themes = {
  light: {
    link: '/static/css/tentacletastic/style-8bc2009cc5.css',
    selector: 'link[rel="stylesheet"][href*="tentacletastic/style"]',
    selectIndex: 1,
  },
  dark: {
    link: '/static/css/coalbytes/style-84dd3a480b.css',
    selector: 'link[rel="stylesheet"][href*="coalbytes/style"]',
    selectIndex: 0,
  },
};

const userPrefersDarkTheme = window.matchMedia(
  '(prefers-color-scheme: dark)'
).matches;

const siteTheme = document.querySelector(themes.dark.selector)
  ? 'dark'
  : 'light';

const doesThemeMatch = userPrefersDarkTheme === (siteTheme === 'dark');

const userPreferredTheme = userPrefersDarkTheme ? 'dark' : 'light';

(() => {
  // If user settings tab page, exit
  const url = new URL(window.location.href);
  if (
    url.pathname === '/user.php' &&
    url.searchParams.get('action') === 'edit'
  ) {
    return;
  }
  if (!doesThemeMatch) {
    const userSettingsTab = window.open(settingsTabUrl, '_blank');
    if (!userSettingsTab) {
      console.error('Could not open user settings tab');
      return;
    }
    userSettingsTab.onload = async () => {
      if (!userSettingsTab?.document) return;
      /** @type {HTMLSelectElement} */
      const stylesheetSelect =
        userSettingsTab.document.getElementById('stylesheet');
      console.log(stylesheetSelect);
      stylesheetSelect.selectedIndex = themes[userPreferredTheme].selectIndex;
      /** @type {HTMLFormElement} */
      const form = userSettingsTab.document.getElementById('userform');
      form.submit();
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`Set theme to ${userPreferredTheme}`);
      userSettingsTab.close();
      document.location.reload();
    };
  }
})();
