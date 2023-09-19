/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Web request
import axios from 'axios';

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
      data: { username: 'guest-username', password: 'guest-pass' },
    });
    // handle success
    console.log('CLI> login success', response.status, '-', response.statusText, response.data);
    if (response.data) {
      const cookies = response.headers['set-cookie'];
      // two cookies: express:sess and express:sess.sig
      const c1 = cookies[0].split(';');
      // const c2 = cookies[1].split(';');
      const loginCookies = c1[0];
      // const loginCookies = c1[0] + '; ' + c2[0];
      console.log('CLI> login cookies', loginCookies);
      // store the cookies into an axios instance
      axiosInstance.defaults.headers['Cookie'] = loginCookies;
      // return the cookies
      return loginCookies;
    }
  } catch (err) {
    // handle error
    console.log('Error> login', err.message);
  }
}

export async function loginCreateUser(server, data) {
  try {
    const response = await axiosInstance.request({
      method: 'post',
      url: '/api/users/create',
      baseURL: server,
      withCredentials: true,
      maxRedirects: 0, // important to get the cookies before redirection
      validateStatus: function (status) {
        return status >= 200 && status <= 302; // redirects are not errors ;-)
      },
      data: data,
    });
    // handle success
    console.log('CLI> login success', response.status, '-', response.statusText);
    if (response.data) {
      // console.log('Create user', response.data.data);
      return response.data.data[0];
    }
  } catch (err) {
    // handle error
    console.log('Error> create user', err.message);
  }
}

export function getInstance() {
  return axiosInstance;
}

/**
 * Get user info over HTTP
 * @returns userData  uid, name, email, color, emailVerified, profilePicture
 */
export async function getUserInfo(id) {
  try {
    const response = await axiosInstance.get('/api/users/' + id);
    // handle success
    console.log('CLI> get user info:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data) {
      return response.data.data[0];
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
export async function setUserName(id, name) {
  const n = name || 'qwerty';
  axiosInstance
    .request({
      method: 'put',
      url: '/api/users/' + id,
      withCredentials: true,
      data: { name: n },
    })
    .then(function (resp) {
      // done
      console.log('setUserName>', resp.status, resp.statusText);
    })
    .catch(function (e) {
      // handle error
      console.log('setUserName> Error', e.message);
    });
}

/**
 * Change color of user pointer
 *
 * @param {string} color
 */
export async function setUserColor(id, color) {
  const c = color || '#B794F4'; // purple
  axiosInstance
    .request({
      method: 'put',
      url: '/api/users/' + id,
      withCredentials: true,
      data: { color: c },
    })
    .then(function (resp) {
      // done
      console.log('setUserColor>', resp.status, resp.statusText);
    })
    .catch(function (e) {
      // handle error
      console.log('setUserColor> Error', e.message);
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
      return response.data.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}

/**
 * Get room info over HTTP
 * @returns roomsData
 */
export async function getRoomsInfo() {
  try {
    const response = await axiosInstance.get('/api/rooms');
    // handle success
    console.log('CLI> get rooms info:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data) {
      return response.data.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
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
        url: '/api/boards/',
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
