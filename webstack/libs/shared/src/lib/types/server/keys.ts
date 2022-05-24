/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Credentials for user autentification APIs (passport, cilogon, ...)
 *
 * @export
 * @interface KeysInterface
 */
export interface KeysInterface {
  // List of login strategies
  strategies: [string];
  // Google API keys
  google: {
    clientId: string;
    clientSecret: string;
  };
  // JWT JSON Web Token (JWT) public key
  jwt?: {
    publicKey: string;
  };
  // CILogon credentials
  cilogon?: {
    clientId: string;
    clientSecret: string;
  };
  // Session management
  session: {
    cookieKey: string;
  };
  // To encrypt the user database
  encryption: {
    cryptr: string;
  };
  // SSL/HTTPS certificates
  ssl: {
    certificateFile: string;
    certificateKeyFile: string;
    certificateChainFile: string;
  };
}