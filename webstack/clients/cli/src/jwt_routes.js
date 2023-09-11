/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Web request
import axios from 'axios';
import { readFileSync } from 'fs';

// An axios instance to store the auth token in
var axiosInstance;

/**
 * Login with JWT
 *
 * @param {string} token
 * @returns {void}
 */
export async function loginJWT(server, token) {
  // An axios instance to store the cookies in
  axiosInstance = axios.create({ baseURL: server });
  try {
    const response = await axios.request({
      method: 'post',
      url: '/auth/jwt',
      baseURL: server,
      // add the right headers for the form
      headers: { Authorization: `Bearer ${token}` },
    });
    // handle success
    console.log('CLI> login success', response.status, '-', response.statusText);
    if (response.status === 200) {
      // Store the same token in the axios instance for next requests
      axiosInstance.defaults.headers['Authorization'] = `Bearer ${token}`;
    }
    return response.data;
  } catch (e) {
    // handle error
    console.log('Error> login', e.message);
    return null;
  }
}

/**
 * Load a token file
 *
 * @export
 * @param {string} tokenFile
 * @returns {string} token
 */
export function loadToken(tokenFile) {
  const tokenData = JSON.parse(readFileSync(tokenFile).toString());
  const keys = Object.keys(tokenData);
  const token = tokenData[keys[0]];
  console.log('JWT> token loaded');
  return token;
}

/**
 * Get user info over HTTP
 * @returns userData  uid, name, email, color, emailVerified, profilePicture
 */
export async function getBoards() {
  try {
    const response = await axiosInstance.get('/api/boards/');
    // handle success
    console.log('CLI> get boards:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data) {
      return response.data.boards;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}
