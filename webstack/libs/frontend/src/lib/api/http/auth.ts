/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Authentication service for the Frontend
 * @file Auth Service for the Frontend
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */


/**
 * Endpoint to login with Google OAuth
 */
function loginWithGoogle(): void {
  // return to host with the same protocol (http/https)
  window.location.replace(`${window.location.protocol}/${window.location.host}/auth/google`);
}

/**
 * Endpoint to login with Guest
 */
function loginWithGuest() {
  console.log('Login User');
  return fetch('/auth/guest', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: 'guest-username', password: 'guest-pass' }),
  }).then((response) => {
    if (response.status == 200) {
      window.location.reload();
    }
  })
}

/**
 * Logout the user out of the current session and user
 */
function logout() {
  console.log('Logout User');
  return fetch('/auth/logout', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      console.log(response);
      return response.json();
    })
    .then((responseJson) => {
      if (responseJson.success) {
        console.log('User successfully logged out.');
        window.location.reload();
      }
    });
}

/**
 * Verify the authentication of the current user.
 * @returns {boolean} returns true if the user if authenticated
 */
async function verifyAuth(): Promise<boolean> {
  return fetch('/auth/verify', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      return response.json();
    })
    .then((responseJson) => {
      if (responseJson.authentication) {
        return Promise.resolve(true);
      } else {
        return Promise.reject();
      }
    });
}

export const AuthHTTPService = {
  verifyAuth,
  logout,
  loginWithGoogle,
  loginWithGuest,
};
