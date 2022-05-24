/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

const fs = require('fs');

// Read files and back up to x-back.json files
let rawUsers = fs.readFileSync('./database/db-users.json');
fs.writeFileSync('./database/db-users-backup.json', rawUsers);
let users = JSON.parse(rawUsers);

let rawAuth = fs.readFileSync('./database/db-auth.json');
fs.writeFileSync('./database/db-auth-backup.json', rawAuth);
let auth = JSON.parse(rawAuth);

// New Objects for the update database
const newUsers = {
  users: []
}

const newAuth = {
  users: []
}

// Read over Users Database
users.users.forEach(user => {
  const id = user.id;
  const authRecord = auth.users.find(el => el.id == id);
  if (authRecord) {
    const authKeys = Object.keys(authRecord);

    // Google User?
    if (authKeys.indexOf('googleId') != -1) {
      user['userType'] = 'client';
      user['userRole'] = 'user';
      newUsers.users.push(user);
      newAuth.users.push(authRecord);
    }

    // SAGE3 User
    else if (authKeys.indexOf('localId') != -1) {
      user['userType'] = 'client';
      user['userRole'] = 'user';
      newUsers.users.push(user);
      newAuth.users.push(authRecord);
    }

    // Guest User
    else if (authKeys.length == 1 && authKeys.indexOf('uid') != -1) {
      user['userType'] = 'client';
      user['userRole'] = 'guest';
      newUsers.users.push(user);
      newAuth.users.push(authRecord);
    }
    // Mismatched keys
    else {

    }
  }
});

// Overwrite the old database
let newUsersData = JSON.stringify(newUsers);
let newAuthData = JSON.stringify(newAuth);
fs.writeFileSync('./database/db-users.json', newUsersData);
fs.writeFileSync('./database/db-auth.json', newAuthData);