/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Generate a JWT: JSON Web Token
 * This file contains the Routes for the authentication services.
 * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
 * @version 1.0.0
 */

const fs = require('fs');

// JSON web token
const jwt = require('jsonwebtoken');
// parsing command-line arguments
const commander = require('commander');


/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;

// Generate the command line handler
commander.program
  .version('1.0')
  .requiredOption('-e, --email <s>', 'email (string) - required')
  .requiredOption('-n, --name <s>', 'full name (string) - required')
  .option('-a, --admin', 'admin - optional', false)
  .option('-o, --output <s>', 'Output token file (string) - optional', 'token.json');

// Parse the arguments
commander.program.parse(args);
// Get the results
const params = commander.program.opts();

console.log('CLI>', params);

const PUB_KEY = fs.readFileSync('jwt_public.pem', 'utf8');
const PRIV_KEY = fs.readFileSync('jwt_private.pem', 'utf8');

// ============================================================
// -------------------  SIGN ----------------------------------
// ============================================================

const payloadObj = {
  sub: params.email,
  name: params.name,
  admin: !!params.admin, // make it boolean
};

/* Sign and output the token */
const signedJWT = jwt.sign(payloadObj, PRIV_KEY, {
  algorithm: 'RS256',
  audience: 'sage3.app',
  issuer: 'sage3app@gmail.com',
  expiresIn: '1year',
});

/* Result>
Token: ....
Payload> {
  sub: 'renambot@gmail.com',
  name: 'Luc Renambot',
  admin: true,
  iat: 1626754175,
  exp: 1658311775,
  aud: 'sage3.app',
  iss: 'sage3app@gmail.com'
}
*/

const token = { "token": signedJWT};
console.log('Token>', signedJWT);

// save the token JSON
fs.writeFileSync(params.output, JSON.stringify(token, null, 4));


// ============================================================
// -------------------  VERIFY --------------------------------
// ============================================================

// Verify the token we just signed using the public key.
// Also validates our algorithm RS256
jwt.verify(signedJWT, PUB_KEY, { algorithms: ['RS256'] }, (err, payload) => {
  if (err) console.log('Error>', err);
  if (err && err.name === 'TokenExpiredError') {
    console.log('Token> Your token has expired!');
  }

  if (err && err.name === 'JsonWebTokenError') {
    console.log('Token> That JWT is malformed!');
  }

  if (err === null) {
    console.log('Token> Your JWT was successfully validated!');
  }

  // Both should be the same
  console.log(payload);
  // console.log(payloadObj);
});
