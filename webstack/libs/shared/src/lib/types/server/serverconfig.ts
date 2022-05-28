/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Configuration parameters for the SAGE3 server
 *
 * @export
 * @interface serverConfiguration
 */
export interface serverConfiguration {
  // Production of development
  production: boolean;

  // version from the package.json file
  version: string;

  // Pretty name of the server to show in the UI
  serverName?: string;

  // HTTP settings
  port: number;
  tlsVersion: string;

  // Folders
  root: string;
  public: string;
  assets: string;
  // Server list
  servers: { name: string; url: string }[];
  // Services
  redis: { url: string };
  // ID management API keys
  auth: AuthConfiguration;
  // SSL/HTTPS certificates
  ssl: {
    certificateFile: string;
    certificateKeyFile: string;
    certificateChainFile: string;
  };
}

/**
 * Credentials for user autentification APIs (passport, cilogon, ...)
 *
 * @export
 * @interface AuthConfiguration
 */

export interface AuthConfiguration {
  // Session management
  sessionMaxAge: number;
  sessionSecret: string;

  // List of login strategies: guest, google, jwt, cilogon, ...
  strategies: [string];

  // Guest
  guestConfig?: {
    routeEndpoint: string;
  };
  // Google API keys
  googleConfig?: {
    clientID: string;
    clientSecret: string;
    routeEndpoint: string;
    callbackURL: string;
  };
  // JWT JSON Web Token (JWT)
  jwtConfig?: {
    publicKey: string;
    issuer: string;
    audience: string;
    routeEndpoint: string;
  };
  // CILogon credentials
  cilogonConfig?: {
    clientID: string;
    clientSecret?: string;
    routeEndpoint: string;
    callbackURL: string;
  };
}
