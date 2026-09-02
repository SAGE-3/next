/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { LLMConfiguration } from './llm';

/**
 * Configuration parameters for the SAGE3 server
 *
 * @export
 * @interface serverConfiguration
 */
export interface ServerConfiguration {
  // Production of development
  production: boolean;

  // Port to run the server on
  port: number;
  port_yjs: number;
  port_files: number;

  // Pretty name of the server to show in the UI
  serverName?: string;

  // version from the package.json file
  version: string;

  // Folders
  root: string;
  public: string;
  assets: string;

  // Redis
  redis: { url: string };

  // Fluentd log configuration
  fluentd: {
    server: string;
    port: number;
    // dbLevel controls the level of logs sent to fluentd from the database
    // all : all logs are sent to fluentd
    // partial (default): all collections except user stuff (user, presence)
    // none: no logs are sent to fluentd
    databaseLevel: 'all' | 'partial' | 'none';
  };

  // Python server for jupyter kernels
  kernels: { url: string };
  // Python server for agents
  agents: { url: string };
  // VEO VNC container orchestration server
  veoServer?: { url: string };
  // Webserver configuration
  webserver: {
    logLevel: 'all' | 'partial' | 'none';
    uploadLimit: string; // in bytes with optional units (KB, MB, GB, TB)
  };

  // External Services
  services: {
    twilio: TwilioConfiguration;
    livekit: LiveKitConfiguration;
    models: LLMConfiguration;
  };

  // Feature flags
  features: {
    plugins: boolean;
    apps: string[];
  };

  // ID management API keys
  auth: AuthConfiguration;

  // Namespace for signing uuid v5 keys
  namespace: string;
}

// Public to everyone response from server to the configuration request, for security reasons
export type PublicInformation = Pick<ServerConfiguration, 'serverName' | 'version' | 'production'> & {
  isSage3: boolean;
  logins: ServerConfiguration['auth']['strategies'];
  onlineUsers: number;
};

// Public to authenticated users from server to the configuration request, for security reasons
export type OpenConfiguration = Pick<ServerConfiguration, 'serverName' | 'version' | 'production' | 'namespace' | 'features'> & {
  token: string;
  admins: ServerConfiguration['auth']['admins'];
  logins: ServerConfiguration['auth']['strategies'];
  features: ServerConfiguration['features'];
  models: ServerConfiguration['services']['models'];
  fluentd: ServerConfiguration['fluentd'];
  veoServer: ServerConfiguration['veoServer'];
};

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

  // List of login strategies: guest, google, apple, jwt, cilogon, keycloak, ldap, spectator
  strategies: ('google' | 'apple' | 'cilogon' | 'guest' | 'jwt' | 'keycloak' | 'ldap' | 'spectator')[];

  // Admin users
  admins: string[];

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
  // JSON Web Token (JWT)
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
  // Keycloak / generic OIDC credentials
  keycloakConfig?: {
    // Full Keycloak realm URL, e.g. https://keycloak.example.com/realms/sage3
    issuerURL: string;
    clientID: string;
    clientSecret?: string;
    routeEndpoint: string;
    callbackURL: string;
  };
  // LDAP / Active Directory
  ldapConfig?: {
    url: string;
    bindDN: string;
    bindCredentials: string;
    searchBase: string;
    searchFilter: string;
    groupMapping: {
      admin?: string;
      user?: string;
      spectator?: string;
    };
    defaultRole: string;
    tlsOptions?: {
      rejectUnauthorized: boolean;
    };
  };
}

// The Twilio Configuration
export interface TwilioConfiguration {
  accountSid: string; // Your Account SID from www.twilio.com/console
  apiKey: string; // API Key
  apiSecret: string; // API Secret
}

// The LiveKit Configuration (self-hosted SFU for screensharing)
export interface LiveKitConfiguration {
  url: string; // WebSocket URL clients use to reach the LiveKit server (e.g. ws://localhost:7880)
  apiKey: string; // API Key, must match the 'keys' entry in the LiveKit server config
  apiSecret: string; // API Secret, must match the 'keys' entry in the LiveKit server config
}
