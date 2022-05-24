/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Web request
import axios from 'axios';
// Prepare a form data structure from login
import FormData from 'form-data';

// Guest login
var bodyFormData = new FormData();
bodyFormData.append('username', 'guest-username');
bodyFormData.append('password', 'guest-pass');

// An axios instance to store the cookies in
var axiosInstance;

/**
 * Login over HTTP
 *
 * @param {string} server
 * @returns login cookies
 */
export async function loginGuestUser(server) {
  // An axios instance to store the cookies in
  axiosInstance = axios.create({ baseURL: server });
  try {
    const response = await axios.request({
      method: 'post',
      url: '/auth/guest',
      baseURL: server,
      withCredentials: true,
      maxRedirects: 0, // important to get the cookies before redirection
      validateStatus: function (status) {
        return status >= 200 && status <= 302; // redirects are not errors ;-)
      },
      // add the right headers for the form
      headers: {
        ...bodyFormData.getHeaders(),
      },
      // the form
      data: bodyFormData,
    });
    // handle success
    console.log('CLI> login success', response.status, '-', response.statusText);
    if (response.data) {
      const cookies = response.headers['set-cookie'];
      // two cookies: express:sess and express:sess.sig
      const c1 = cookies[0].split(';');
      const c2 = cookies[1].split(';');
      const loginCookies = c1[0] + '; ' + c2[0];
      // store the cookies into an axios instance
      axiosInstance.defaults.headers['Cookie'] = loginCookies;
      // return the cookies
      return loginCookies;
    }
  } catch (e) {
    // handle error
    console.log('Error> login', e);
  }
}

export function getInstance() {
  return axiosInstance;
}

/**
 * Get user info over HTTP
 * @returns userData  uid, name, email, color, emailVerified, profilePicture
 */
export async function getUserInfo() {
  try {
    const response = await axiosInstance.get('/auth/info');
    // handle success
    console.log('CLI> get user info:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data) {
      return response.data.user;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e);
  }
}

/**
 * Get data info over HTTP
 * @returns piece of data
 */
export async function getData(server, id) {
  try {
    const response = await axios.request({
      method: 'get',
      url: '/api/data/' + id,
      baseURL: server,
    });
    // handle success
    if (response.status === 200 && response.data) {
      return response.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e);
  }
}

/**
 * Change name of user
 *
 * @param {string} new name
 */
export async function setUserName(name) {
  const n = name || 'qwerty';
  axiosInstance
    .request({
      method: 'post',
      url: '/api/user/update/username',
      withCredentials: true,
      data: { name: n },
    })
    .then(function (resp) {
      // done
      console.log('setUserName>', resp.status, resp.statusText);
    })
    .catch(function (e) {
      // handle error
      console.log('setUserName> Error', e);
    });
}

/**
 * Change color of user pointer
 *
 * @param {string} color
 */
export async function setUserColor(color) {
  const c = color || '#B794F4'; // purple
  axiosInstance
    .request({
      method: 'post',
      url: '/api/user/update/usercolor',
      withCredentials: true,
      data: { color: c },
    })
    .then(function (resp) {
      // done
      console.log('setUserColor>', resp.status, resp.statusText);
    })
    .catch(function (e) {
      // handle error
      console.log('setUserColor> Error', e);
    });
}

/**
 * Get board info over HTTP
 * @returns boardsData
 */
export async function getBoardsInfo() {
  try {
    const response = await axiosInstance.get('/api/boards');
    // handle success
    console.log('CLI> get boards info:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data) {
      return response.data.boards;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e);
  }
}

/**
 * Get board info over HTTP
 * @param {string} board
 * @returns boardData
 */
export async function getBoardState(board) {
  try {
    const response = await axiosInstance.get('/api/boards/state/' + board);
    // handle success
    console.log('CLI> get board info:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data) {
      return response.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e);
  }
}

/**
 * Create a new board
 * @param {any} boardInfo
 * @returns
 */
export async function createBoard(boardInfo) {
  try {
    axiosInstance
      .request({
        method: 'post',
        url: '/api/boards/create',
        withCredentials: true,
        data: boardInfo,
      })
      .then(function (resp) {
        // done
        console.log('createBoard>', resp.status, resp.statusText);
      })
      .catch(function (e) {
        // handle error
        console.log('createBoard> Error', e);
      });
  } catch (e) {
    // handle error
    console.log('Error>', e);
  }
}
