/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Handles behavior of remoteSiteWindow.html web page.
 * Bring up page with cmd+k on Mac, ctrl+k on windows.
 * This gives a user-friendly navigation/connection to different SAGE sites.
 * The user can see the remote sites connected to the current one, see their
 * online/offline status, add them in a persistent favorites list, choose
 * the ClientID among the available ones, default is Full Screen.
 * If a password is required the user is also given the possibility to
 * insert one. The password hash is automatically saved locally.
 *
 * @class electron
 * @module remote-connection
 * @submodule electron
 * @requires electron, fs, os, path,
 */
'use strict';

/******************************* Node modules ********************************/
const electron = require('electron');
const fs = require('fs');
const { ipcRenderer } = electron;
const { platform, homedir } = require('os');
const { join } = require('path');

/************************* DOM element declaration ***************************/
// const favoriteHeart = document.getElementById("favorite_heart");
const favoriteList = document.getElementById('favorites_list');
const idDropdown = document.getElementById('ids_dropdown');
const idDropName = document.getElementById('id_drop');
const check1 = document.getElementById('check_1');
const check2 = document.getElementById('check_2');
const urlInput = document.getElementById('url');
const okayBtn = document.getElementById('okay_btn');
const addBtn = document.getElementById('add_btn');
const siteInfoHTML = document.getElementById('site_info_html');
const loadSiteInfoBtn = document.getElementById('current_status_btn');
const statusText = document.getElementById('status_text');
const pwdInput = document.getElementById('password');

/********************** html classes and attribute values ********************/
const buttonColorClass = 'blue-grey darken-2';
const pulseClass = 'pulse';
const blackColor = '#222222';

const favorites_file_name = 'sage3_favorite_sites.json';
const REFRESH_SITES_STATUS_TIME = 5000;
const FILE_VERSION = 1;

const PREDEFINED_LOCAL_PORT = '3333';

//JS object containing list of favorites sites
var favorites = {
  list: [
    {
      host: 'https://chicago.sage3.app',
      name: 'SAGE3 Main',
      pinned: true,
    },
  ],
  Version: FILE_VERSION,
};

// Variables for the current site
let passwordRequired = false;
let isHashSaved = false;
let currentlySelectedItemElem;
let currentlySelectedHost;
let lastCheckedSiteName;
let lastClickedCheck = false;
let cached_config_files = {};

// Reading the favorites json file
fs.readFile(getAppDataPath(favorites_file_name), 'utf8', function readFileCallback(err, data) {
  if (err) {
    // most likely no json file (first use), write empty favorites on file
    console.log(err);
    writeFavoritesOnFile(favorites);
    if (favorites.list.length > 0) {
      populateFavorites(favorites.list);
    }
  } else {
    // convert json to object
    favorites = JSON.parse(data);
    if (favorites.list.length > 0) {
      populateFavorites(favorites.list);
    }
  }
});

/********************************* Functions *********************************/

/**
 * Gets the windows path to a temporary folder to store data
 *
 * @return {String} the path
 */
function getWindowPath() {
  return join(homedir(), 'AppData');
}

/**
 * Gets the Mac path to a temporary folder to store data (/tmp)
 *
 * @return {String} the path
 */
function getMacPath() {
  return '/tmp';
}

/**
 * Gets the Linux path to a temporary folder to store data
 *
 * @return {String} the path
 */
function getLinuxPath() {
  return join(homedir(), '.config');
}

/**
 * In case the platform is among the known ones (for the potential
 * future os platforms)
 *
 * @return {String} the path
 */
function getFallback() {
  if (platform().startsWith('win')) {
    return getWindowPath();
  }
  return getLinuxPath();
}

/**
 * Creates the path to the file in a platform-independent way
 *
 * @param  {String} file_name the name of the file
 * @return the path to the file
 */
function getAppDataPath(file_name) {
  let appDataPath = '';
  switch (platform()) {
    case 'win32':
      appDataPath = getWindowPath();
      break;
    case 'darwin':
      appDataPath = getMacPath();
      break;
    case 'linux':
      appDataPath = getLinuxPath();
      break;
    default:
      appDataPath = getFallback();
  }
  if (file_name === undefined) {
    return appDataPath;
  } else {
    return join(appDataPath, file_name);
  }
}

function addSite() {
  let aURL = urlInput.value;
  // if (aURL.startsWith('https://')) {
  //   aURL = aURL.substring(8);
  // }
  // if (aURL.startsWith('http://')) {
  //   aURL = aURL.substring(7);
  // }
  let sitename = lastClickedCheck ? lastCheckedSiteName : aURL.split(':')[1];
  if (sitename === undefined) {
    sitename = aURL.split('.')[0];
  }

  var favoriteItem = {
    name: sitename,
    host: aURL,
    pinned: false,
  };

  addToFavorites(favoriteItem);
  addItemToList(favoriteItem);
}

/**
 * Populates the carousel and list with the given array of sites objects
 *
 * @param  {Array of sites objects} favorites_list
 */
function populateFavorites(favorites_list) {
  if (!favorites_list) {
    return;
  }
  favorites_list.forEach(addItemToList);
}

/**
 * Adds a class or more classes to the html element
 *
 * @param  {HTML element} elem the html element
 * @param  {String} classes space separated classes identifiers
 * @return {void}
 */
function addClass(elem, classes) {
  let arr = classes.split(' ');
  for (let i = 0; i < arr.length; i++) {
    elem.classList.add(arr[i]);
  }
}

/**
 * Removes a class or more classes from the html element
 *
 * @param  {HTML element} elem the html element
 * @param  {String} classes space separated classes identifiers
 * @return {void}
 */
function removeClass(elem, classes) {
  let arr = classes.split(' ');
  for (let i = 0; i < arr.length; i++) {
    elem.classList.remove(arr[i]);
  }
}

/**
 * Enables the password input field
 *
 * @return {void}
 */
function enablePassword() {
  passwordRequired = true;
  pwdInput.removeAttribute('disabled');
}

/**
 * Disables the password input field
 *
 * @return {void}
 */
function disablePassword() {
  passwordRequired = false;
  pwdInput.setAttribute('disabled', '');
}

/**
 * Adds an item to the UI list of favorites
 *
 * @param  {site object} item a site object
 * @param  {int} index the index in the array of objects
 * @return {void}
 */
function addItemToList(item, index) {
  var pinnedHTMLString = 'favorite';
  if (!item.pinned) {
    pinnedHTMLString = 'favorite_border';
  }
  let it = document.createElement('LI');
  addClass(it, 'collection-item grey lighten-2 z-depth-3');
  let htmlCode = `<div><b><span>${item.name}</span> -</b> <span>${item.host}</span><a href="#!" class="secondary-content">
						<i class="material-icons style="color:${blackColor};">${pinnedHTMLString}</i><b>&nbsp&nbsp</b>
						<i class="material-icons style="color:${blackColor};">delete</i>
                            </a>
                    </div>`;
  it.innerHTML = htmlCode;

  // it.addEventListener('click', selectFavoriteSite);
  if (item.pinned) {
    it.firstElementChild.lastElementChild.firstElementChild.addEventListener('click', removeFavoriteSiteList);
  } else {
    it.firstElementChild.lastElementChild.firstElementChild.addEventListener('click', addFavoriteSiteList);
  }
  it.firstElementChild.lastElementChild.lastElementChild.addEventListener('click', deleteSite);
  it.style.color = 'grey';
  if (item.pinned) {
    favoriteList.insertBefore(it, favoriteList.firstChild);
  } else {
    favoriteList.appendChild(it);
  }
  it.firstElementChild.lastElementChild.firstElementChild.style.color = blackColor;
  it.firstElementChild.lastElementChild.lastElementChild.style.color = blackColor;
  setOnlineStatus(buildConfigURL(item.host), item.host, it.firstElementChild.lastElementChild.firstElementChild, it, 1000);
}

/**
 * Adds an item to the UI list of favorites
 *
 * @param  {site object} item a site object
 * @param  {int} index the index in the array of objects
 * @return {void}
 */
function addConnectedSiteToList(item, index) {
  //add only if not present in favorites already
  if (alreadyInFavorites(item.host)) {
    return;
  }
  let it = document.createElement('li');
  addClass(it, 'collection-item grey lighten-2 z-depth-3');
  let htmlCode = `<div><b><span>${item.name}</span> -</b> <span>${item.host}</span><a href="#!" class="secondary-content">
	<i class="material-icons style="color:${blackColor};">favorite_border</i>
	<b>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</b>
						 <i></i>
                            </a>
                    </div>`;
  it.innerHTML = htmlCode;

  // it.addEventListener('click', selectFavoriteSite);
  it.firstElementChild.lastElementChild.firstElementChild.addEventListener('click', addFavoriteSiteList);
  // it.firstElementChild.lastElementChild.lastElementChild.addEventListener('click', deleteSite);
  it.style.color = 'grey';
  if (favoriteList.lastChild == null) {
    favoriteList.appendChild(it);
  } else {
    favoriteList.insertBefore(it, favoriteList.lastChild.nextSibling);
  }
  it.firstElementChild.lastElementChild.firstElementChild.style.color = blackColor;
  // it.firstElementChild.lastElementChild.lastElementChild.style.color = blackColor;
  setOnlineStatus(buildConfigURL(item.host), item.host, it.firstElementChild.lastElementChild.firstElementChild, it, 1000);
}

/**
 * Onclick function for clicking on a favorite site in the favorites carousel or list, select the site,
 * it inserts in the url input the current host, loads the information about the site, color heart,
 * check if the hash of the password was previously saved and in case it is, it inserts it into the
 * password field and also sets the isHashSaved variable to true
 *
 * @param  {<a> element} element the clicked <a> element
 * @return {void}
 */
function selectFavoriteSite(event) {
  lastClickedCheck = false;

  var elem = event.target;
  if (elem.tagName === 'SPAN') {
    elem = elem.parentElement.parentElement;
  }
  if (elem.tagName === 'DIV') {
    elem = elem.parentElement;
  }
  if (elem.tagName === 'LI') {
    let host = elem.firstElementChild.firstElementChild.nextElementSibling.innerText;
    if (currentlySelectedItemElem) {
      setOnlineColorItem(currentlySelectedItemElem);
    }
    populateSiteInfoPopup(host);
    currentlySelectedItemElem = elem;
    currentlySelectedHost = host;
    setSelectedColorItem(elem);

    // fetch config file and update UI
    loadSiteInfo(host, false);
  }
}

/**
 * Onclick function for clicking on the heart on a card in the list
 * unpin but keeps it in favorites
 *
 * @method removeFromFavorites
 * @param {<a> element}
 */
function removeFavoriteSiteList(event) {
  if (event.target.innerHTML == 'favorite_border') {
    addFavoriteSiteList(event);
    return;
  }
  var aURL = event.target.parentElement.parentElement.firstElementChild.nextElementSibling.innerText;
  event.target.innerHTML = 'favorite_border';

  unpinFavorite(aURL);
}

/**
 * Onclick function for clicking on the empty heart on a list item (connected site)
 * Add to favorites JSON, write JSON file, update list removing the site,
 *
 * @method addFromFavorites
 * @param {<a> element}
 */
function addFavoriteSiteList(event) {
  if (event.target.innerHTML == 'favorite') {
    removeFavoriteSiteList(event);
    return;
  }
  var itemInside = event.target.parentElement.parentElement;
  var aURL = itemInside.firstElementChild.nextElementSibling.innerText;
  let sitename = itemInside.firstElementChild.firstElementChild.innerText;
  // if(sitename === undefined){
  // 	sitename =  aURL.split('.')[0];
  // }
  removeFromFavorites(aURL);
  addToFavorites({
    name: sitename || aURL.split('.')[0], //TODO whenever site is online fetch name
    host: aURL,
    pinned: true,
  });
  event.target.innerHTML = 'favorite';
  // event.target.removeEventListener('click', addFavoriteSiteList);
  // event.target.addEventListener('click', removeFavoriteSiteList);
  //remove from connected sites list since it is pinned in favorites
  // var parent = itemInside.parentElement.parentNode;
  // var item = itemInside.parentElement;
  // parent.removeChild(item);
}

function deleteSite(event) {
  var aURL = event.target.parentElement.parentElement.firstElementChild.nextElementSibling.innerText;
  dynamicItemRemovingInList(aURL);
}

/**
 * Adds a new favorite site to the favorite json if it is not already in the list and writes back to file
 *
 * @method addToFavorites
 * @param {site object} favorite_item the site objet that needs to be added to favorites
 */
function addToFavorites(favorite_item) {
  if (!alreadyInFavorites(favorite_item.host)) {
    favorites.list.push(favorite_item);
    writeFavoritesOnFile(favorites);
    // addItemToList(favorite_item);
  }
}

/**
 * Checks if the host is already in the favorites list
 * @param  {String} host the host of the site
 * @return {Boolean} true if the host is already in the favorites list
 */
function alreadyInFavorites(host) {
  if (favorites.list.length === 0) {
    return false;
  }
  var favorite = 0;
  for (favorite of favorites.list) {
    if (favorite.host === host) {
      return true;
    }
  }
  return false;
}

/**
 * Removes the favorite site from the list in the favorites object, writes back to the JSON, handles UI refreshing
 *
 * @method removeFromFavorites
 * @param  {String} favorite_url the url of the site
 * @return {void}
 */
function removeFromFavorites(favorite_url) {
  for (let i = 0; i < favorites.list.length; i++) {
    if (favorite_url === favorites.list[i].host) {
      favorites.list.splice(i, 1);
      writeFavoritesOnFile(favorites);
    }
  }
}

function unpinFavorite(favorite_url) {
  for (let i = 0; i < favorites.list.length; i++) {
    if (favorite_url === favorites.list[i].host) {
      favorites.list[i].pinned = false;
      writeFavoritesOnFile(favorites);
    }
  }
}

function dynamicItemRemovingInList(aURL) {
  for (let i = 0; i < favorites.list.length; i++) {
    if (aURL === favorites.list[i].host) {
      favorites.list.splice(i, 1);
      writeFavoritesOnFile(favorites);
    }
    if (favoriteList.children[i].firstChild.firstChild.nextElementSibling.textContent == aURL) {
      favoriteList.removeChild(favoriteList.children[i]);
    }
  }
}

/**
 * Writes favorites in a persistent way on local machine
 *
 * @method writeFavoritesOnFile
 * @param {Object} favorites_obj the object containing the list of favorites
 */
function writeFavoritesOnFile(favorites_obj) {
  fs.writeFile(getAppDataPath(favorites_file_name), JSON.stringify(favorites_obj, null, 4), 'utf8', () => {});
}

/**
 * Creates the config file URL from site domain
 *
 * @method buildConfigURL
 * @param  {String} domain the site domain
 * @return the URL for the config file
 */
function buildConfigURL(domain) {
  let protocol;
  // if (domain.startsWith('https://')) {
  //   domain = domain.substring(8);
  // }
  // if (domain.startsWith('http://')) {
  //   domain = domain.substring(7);
  // }
  // if (domain === 'localhost' || domain === '127.0.0.1') {
  //   domain = domain + ':' + PREDEFINED_LOCAL_PORT;
  // }
  // return 'https://' + domain + '/config';
  if (domain.startsWith('https://')) {
    protocol = 'https://';
    domain = domain.substring(8);
  }
  if (domain.startsWith('http://')) {
    protocol = 'http://';
    domain = domain.substring(7);
  }
  if (domain === 'localhost' || domain === '127.0.0.1') {
    domain = domain + ':' + PREDEFINED_LOCAL_PORT;
  }
  return protocol + domain + '/api/configuration';
}

/**
 * Adds an event listener to all IDs in dropdown
 *
 * @method attachBehaviorDropdownIds
 * @return {void}
 */
function attachBehaviorDropdownIds() {
  const dropd = document.querySelectorAll('.clickable-id');

  dropd.forEach(function (item) {
    item.addEventListener('click', (e) => {
      idDropName.innerHTML = e.target.innerHTML;
    });
  });
}

/**
 * Removes all the items in the dropdown with id: ul_id
 *
 * @method removePreviousDropdownItem
 * @param  {String} ul_id the html id of the ul dropdown
 * @return {void}
 */
function removePreviousDropdownItem(ul_id) {
  document.getElementById(ul_id).innerHTML = '';
}

/**
 * Refreshes the dropdowns given a new config JSON file from a site
 *
 * @method populateUI
 * @param  {JSON} config_json the json config file from a site
 * @return {void}
 */
function populateUI(config_json, attachConnectedSites) {
  removePreviousDropdownItem('ids_dropdown'); //clean IDs of previous selection
  if (attachConnectedSites) {
    addConnectedSitesToList(config_json.remote_sites);
  }
  populateDropdownIds(config_json.displays);

  lastCheckedSiteName = config_json.name;

  if (config_json.passwordProtected) {
    enablePassword();
    handlePasswordHash(config_json.host);
  } else {
    resetPasswordStatus();
  }
}

/**
 * Resets the password input field value by removing the content and disabling it
 *
 * @return {void}
 */
function resetPasswordStatus() {
  pwdInput.value = '';
  isHashSaved = false;
  disablePassword();
}

/**
 * If the hash of the password was previously saved and in case it is, it inserts it into the
 * password field and also sets the isHashSaved variable to true
 *
 * @param  {String} host the host of the site loaded
 * @return {void}
 */
function handlePasswordHash(host) {
  for (let i = 0; i < favorites.list.length; i++) {
    if (favorites.list[i].host === host) {
      if (favorites.list[i].hash !== undefined) {
        pwdInput.value = favorites.list[i].hash;
        isHashSaved = true;
      }
    }
  }
}

/**
 * Populates the IDs dropdown and initializes the items with an onlclick behavior
 *
 * @method populateDropdownIds
 * @param  {Object} display_ids the displays object from the JSON config
 */
function populateDropdownIds(display_ids) {
  if (!display_ids) {
    return;
  }
  display_ids.forEach(createDropItemIds);
  attachBehaviorDropdownIds();
}

/**
 * Adds the connected sites to the current one to the list
 *
 * @method addConnectedSitesToList
 * @param remote_sites the remote_sites object from the JSON config
 */
function addConnectedSitesToList(remote_sites) {
  if (!remote_sites) {
    return;
  }
  remote_sites.forEach(addConnectedSiteToList);
  // attachBehaviorDropdownSites();
}

/**
 * Creates a dropdown item for the IDs dropdown and appends it
 *
 * @param  {Object} item client ID object
 * @param  {int} index the index of the client ID
 * @return {void}
 */
function createDropItemIds(item, index) {
  let it = document.createElement('LI');
  let htmlCode = `<a class='clickable-id' >${index}</a>`;
  it.innerHTML = htmlCode;
  idDropdown.appendChild(it);
}

/**
 * Take site's host and format it properly as a URL, handling clientID and password
 *
 * @method formatProperly
 * @param  {String} aURL the host site url to be formatted
 * @return {String} the formatted url
 */
function formatProperly(aURL) {
  if (aURL.startsWith('https://')) {
    aURL = aURL.substring(8);
  }
  if (aURL.startsWith('http://')) {
    aURL = aURL.substring(7);
  }
  const url_start = 'https://';
  if (aURL === 'localhost' || aURL == '127.0.0.1') {
    aURL = aURL + ':' + PREDEFINED_LOCAL_PORT;
  }
  if (!url.startsWith('http://') || !aURL.startsWith('https://')) {
    aURL = url_start + aURL;
  }

  // If display number is toggled then take the ID, if NaN do full screen
  if (check1.checked) {
    var id = isNaN(parseInt(idDropName.innerHTML)) ? -1 : parseInt(idDropName.innerHTML);

    if (id > -2) {
      aURL = aURL + '/display.html?clientID=' + id;
    }
  } else {
    aURL = aURL + '/display.html?clientID=-1';
  }
  if (passwordRequired) {
    var pwd = pwdInput.value;
    if (pwd == '') {
      // if the password field is empty try to connect without using a password
      return aURL;
    } else {
      if (isHashSaved) {
        // Correct hash previously saved locally
        aURL = aURL + '&hash=' + pwd;
      } else {
        // Normal password
        aURL = aURL + '&session=' + pwd;
      }
    }
  }
  return aURL;
}

// /**
//  * Sends a message to the main electron window to say to close this menu
//  *
//  * @return {void}
//  */
// function cancelOnClick() {
// 	// ipcRenderer.send('close-connect-page', "0");
// }

/**
 * Sends a message to the main electron window to request the connection to the specified page
 * @return {void}
 */
function okayOnClick() {
  // sending URL to electron.js, params: key value pair (id,URL)
  if (urlInput.value == '') {
    connectToPage(currentlySelectedHost);
  } else {
    connectToPage(urlInput.value);
  }
}

function connectToPage(aURL) {
  // let nURL = formatProperly(aURL);
  ipcRenderer.send('connect-url', aURL);
}

/**
 * Handles the UI update if the current site is down by removing the
 * list of IDs and Connected sites from the relative dropdowns, disables
 * the connect button and colors the Info Button in red
 * @return {void}
 */
function onCurrentSiteDown() {
  lastClickedCheck = false;
  resetPasswordStatus();
  removePreviousDropdownItem('ids_dropdown');
  setLoadInfoButtonOffline();
  disableConnection();
  // console.log('Site server down, timeout reached, refresh to try again');
}

/**
 * fetches the config JSON from the site's url provided, executes the
 * onTimeout function if the delay is passed without hearing back from
 * the fetch callback. Otherwise it populates the UI with the JSON
 * containing the list of connected sites
 *
 * @param {String} aURL the url to fetch from
 * @param {int} delay the timeout time in ms
 * @param {function} onTimeout the function to be executed in case of timeout
 */
function fetchWithTimeout(aURL, host, delay, attachConnectedSites, onTimeout) {
  const timer = new Promise((resolve) => {
    setTimeout(resolve, delay, {
      timeout: true,
    });
  });

  return Promise.race([fetch(aURL), timer])
    .then((response) => {
      if (response.timeout) {
        onTimeout();
        return null;
      } else {
        return response.json();
      }
    })
    .then((json) => {
      if (json) {
        // saved cached config file
        cached_config_files[host] = json;
        populateUI(json, attachConnectedSites);
        if (!attachConnectedSites) {
          enableConnection();
          setLoadInfoButtonOnline();
        }
      }
    })
    .catch((err) => {
      setLoadInfoButtonOffline();
    });
}

function setOnlineColorItem(elem) {
  removeClass(elem, 'grey lighten-2');
  removeClass(elem, 'teal');
  addClass(elem, 'blue-grey darken-2');
}

function setSelectedColorItem(elem) {
  removeClass(elem, 'blue-grey darken-2');
  addClass(elem, 'teal lighten-2');
}

function enableSiteItem(elem) {
  elem.addEventListener('click', selectFavoriteSite);
  elem.style.cursor = 'pointer';
  if (!elem.classList.contains('blue-grey') && !elem.classList.contains('teal')) {
    //if it is not already colored to be online or selected, color it
    setOnlineColorItem(elem);
  }
  elem.style.color = 'white';

  elem.addEventListener('dblclick', (e) => {
    var elem = e.target;
    if (elem.tagName === 'SPAN') {
      elem = elem.parentElement.parentElement;
    }
    if (elem.tagName === 'DIV') {
      elem = elem.parentElement;
    }
    if (elem.tagName === 'LI') {
      let host = elem.firstElementChild.firstElementChild.nextElementSibling.innerText;
      connectToPage(host);
    }
  });
}

/**
 * Sets the color of card to display online/offline status
 *
 * @param  {String} aURL of the config file (https://url:port/config)
 * @param  {HTML element} elem card elem
 * @param  {host} url and port (url:port)
 * @param  {any} delay time in ms to wait for fetch request before declaring to be offline
 * @return void
 */
function setOnlineStatus(aURL, host, elem, itemElem, delay) {
  enableSiteItem(itemElem);
  cached_config_files[host] = {};
  // Setting offline as default
  // const timer = new Promise((resolve) => {
  //   setTimeout(resolve, delay, {
  //     timeout: true,
  //   });
  // });

  // return Promise.race([fetch(aURL), timer])
  //   .then((response) => {
  //     if (response.timeout) {
  //       return;
  //     } else {
  //       enableSiteItem(itemElem);
  //       return response.json();
  //     }
  //   })
  //   .then((json) => {
  //     if (json) {
  //       //saved cached config file
  //       cached_config_files[host] = json;
  //     }
  //   });
}

/**
 * Sets colors of the load site info button to display null site status
 * @return {void}
 */
function resetSiteInfo() {
  addClass(loadSiteInfoBtn, buttonColorClass);
  statusText.innerHTML = 'Enter the hostname and port number of the secure server (example.com:4343)';
}

/**
 * Sets colors of the load site info button to display online site
 * @return {void}
 */
function setLoadInfoButtonOnline() {
  // removeClass(loadSiteInfoBtn, buttonColorClass);
  // loadSiteInfoBtn.style.background = onlineColor;
  statusText.innerHTML = 'Online';
}

function pulseOnce(elem) {
  addClass(elem, pulseClass);
  setTimeout(() => {
    removeClass(elem, pulseClass);
  }, 1000);
}

/**
 * Enables the connect button
 *
 * @return {void}
 */
function enableConnection() {
  removeClass(okayBtn, 'disabled');
  pulseOnce(okayBtn);
}

/**
 * Disables the connect button
 *
 * @return {void}
 */
function disableConnection() {
  addClass(okayBtn, 'disabled');
}

/**
 * Enables the connect button
 *
 * @return {void}
 */
function enableCheck() {
  removeClass(loadSiteInfoBtn, 'disabled');
  // pulseOnce(loadSiteInfoBtn);
}

/**
 * Disables the connect button
 *
 * @return {void}
 */
function disableCheck() {
  addClass(loadSiteInfoBtn, 'disabled');
}

/**
 * Enables the connect button
 *
 * @return {void}
 */
function enableAddSite() {
  removeClass(addBtn, 'disabled');
  // pulseOnce(addBtn);
}

/**
 * Disables the connect button
 *
 * @return {void}
 */
function disableAddSite() {
  addClass(addBtn, 'disabled');
}

/**
 * Sets colors of the load site info button to display offline site
 * @return {void}
 */
function setLoadInfoButtonOffline() {
  // removeClass(loadSiteInfoBtn, buttonColorClass);
  // loadSiteInfoBtn.style.background = offlineColor;
  statusText.innerHTML = 'Unreachable';
}

/**
 * Onclick handler for Load site info button. gets the current site in url and loads its info
 * @return {void}
 */
function loadCurrentSiteInfo() {
  lastClickedCheck = true;
  loadSiteInfo(urlInput.value);
}

/**
 * Loads information about a site given its host. Populates dropdowns, sets online/offline status
 * @param  {String} host the host of the site to load
 * @return {void}
 */
function loadSiteInfo(host, attachConnectedSites) {
  fetchWithTimeout(buildConfigURL(host), host, 1000, attachConnectedSites, () => {
    onCurrentSiteDown();
  }).catch((err) => {
    lastClickedCheck = false;
    throw err;
  });
}

function refreshSiteStatus(it) {
  var host = it.firstElementChild.firstElementChild.nextElementSibling.innerText;
  setOnlineStatus(buildConfigURL(host), host, it.firstElementChild.lastElementChild.firstElementChild, it, 1000);
}

function refreshSitesStatus() {
  var children = Array.from(favoriteList.children);
  children.forEach(refreshSiteStatus);
}

function populateSiteInfoPopup(host) {
  var conf = cached_config_files[host];
  // var html = buildInfoHTML(conf);
  // siteInfoHTML.innerHTML = html;
  siteInfoHTML.innerHTML = '';
}

/**
 * Build some HTML to show info about the SAGE server
 *
 * @method buildAboutHTML
 * @return {String} HTML popup showing version and info
 */
function buildInfoHTML(config) {
  var versionText = '<p>';

  versionText += "<p class='textDialog'><span style='font-weight:bold;'>Name</span>: " + config.name + '</p>';

  // Add host information
  versionText += "<p class='textDialog'><span style='font-weight:bold;'>Host</span>: " + config.host + '</p>';

  // Add version
  versionText += "<p class='textDialog'><span style='font-weight:bold;'>SAGE Version: </span>";
  if (config.version.branch && config.version.commit && config.version.date) {
    versionText += '<b>v' + config.version.base + '-' + config.version.branch + '-' + config.version.commit + '</b> ' + config.version.date;
  } else {
    versionText += '<b>v' + config.version.base + '</b>';
  }
  versionText += '</p>';

  // Configuration
  versionText +=
    "<p class='textDialog'><span style='font-weight:bold;'>Resolution</span>: " +
    config.totalWidth +
    ' x ' +
    config.totalHeight +
    ' pixels';
  versionText += ' (' + config.layout.columns + ' by ' + config.layout.rows + ' tiles';
  versionText += '  - ' + config.resolution.width + ' x ' + config.resolution.height + ')' + '</p>';
  versionText += "<p class='textDialog'><span style='font-weight:bold;'>Password protected</span>: " + config.passwordProtected + '</p>';

  return versionText;
}

/**************************** Functions finished *****************************/

// Catches the message sent from the main electron window that is providing the current location
ipcRenderer.on('current-location', (e, host) => {
  // urlInput.value = host;
  if (!host) {
    return;
  }
  loadSiteInfo(host, true);
});

/******************* Adding event listeners to html elems ********************/

// Initialize dropdown ids
document.addEventListener('DOMContentLoaded', function () {
  var elems = document.querySelectorAll('.dropdown-trigger');
  let options = {
    edge: 'left',
    hover: true,
    // noWrap: true
  };
  M.Dropdown.init(elems, options);

  let opts = {};
  var modals = document.querySelectorAll('.modal');
  M.Modal.init(modals, opts);
  // attachBehaviorDropdownSites();
});

// Adds behavior to ClientID checkbox1 input
check1.addEventListener('click', (e) => {
  var checked = e.target.checked;
  if (checked) {
    if (check2.checked) {
      check2.checked = false;
    }
    addClass(idDropName, 'scale-in');
  }
});

// Adds behavior to ClientID checkbox2 input
check2.addEventListener('click', (e) => {
  var checked = e.target.checked;
  if (checked) {
    if (check1.checked) {
      check1.checked = false;
    }
    removeClass(idDropName, 'scale-in');
  }
});

okayBtn.addEventListener('click', okayOnClick);
addBtn.addEventListener('click', addSite);
// cancelBtn.addEventListener('click', cancelOnClick);
loadSiteInfoBtn.addEventListener('click', loadCurrentSiteInfo);

// Checks if modified url input contains host of a site in favorite and sets the heart status and loads site information,
// Removes password and disables password input
urlInput.addEventListener('input', (e) => {
  let host = urlInput.value;
  if (host === '') {
    disableCheck();
    disableAddSite();
  } else {
    if (host.length > 0) {
      enableAddSite();
      enableCheck();
    }
  }
  resetPasswordStatus();
  if (alreadyInFavorites(host)) {
    // setFullHeart();
    loadSiteInfo(host, false);
  } else {
    // setEmptyHeart();
    resetSiteInfo();
    disableConnection();
  }
});

setInterval(refreshSitesStatus, REFRESH_SITES_STATUS_TIME);
