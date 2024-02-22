/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Web request
import axios from 'axios';
import { readFileSync, createReadStream } from 'fs';
// Prepare a form data structure for upload
import FormData from 'form-data';

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
    if (response.data.success) {
      return response.data.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}

export async function getRooms() {
  try {
    const response = await axiosInstance.get('/api/rooms/');
    // handle success
    console.log('CLI> get rooms:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data.success) {
      return response.data.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}

export async function createRoom(roomInfo) {
  try {
    const response = await axiosInstance.post('/api/rooms/', roomInfo);
    // handle success
    console.log('CLI> createRoom:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data.success) {
      return response.data.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}

export async function createBoard(boardInfo) {
  try {
    const response = await axiosInstance.post('/api/boards/', boardInfo);
    // handle success
    console.log('CLI> createBoard:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.data.success) {
      return response.data.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}

export async function uploadFile(filePath, roomId) {
  try {
    var bodyFormData = new FormData();
    bodyFormData.append('files', createReadStream(filePath));
    // bodyFormData.append('targetX', x);
    // bodyFormData.append('targetY', y);
    bodyFormData.append('room', roomId);

    const response = await axiosInstance.request({
      method: 'post',
      url: '/api/assets/upload',
      withCredentials: true,
      // add the right headers for the form
      headers: {
        ...bodyFormData.getHeaders(),
      },
      // the form
      data: bodyFormData,
    });
    // handle success
    console.log('CLI> uploadFile:', response.request.res.responseUrl, '-', response.status, '-', response.statusText);
    if (response.status === 200) {
      return response.data;
    }
  } catch (e) {
    // handle error
    console.log('Error>', e.message);
  }
}
