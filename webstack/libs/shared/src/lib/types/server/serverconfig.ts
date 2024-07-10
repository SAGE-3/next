/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Configuration parameters for the SAGE3 server
 *
 * @export
 * @interface serverConfiguration
 */
export interface ServerConfiguration {
  // Production of development
  production: boolean;

  // Pretty name of the server to show in the UI
  serverName?: string;

  // version from the package.json file
  version: string;

  // HTTP settings
  port: number;
  tlsVersion: string;

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

  // FastAPI
  fastapi: { url: string };

  // External Services
  services: {
    openai: OpenAIConfiguration;
    zoom: ZoomSDKConfiguration;
    chat: AIChatConfiguration;
    codellama: CodeLlamaConfiguration;
    yolo: YoloConfiguration;
  };

  // Feature flags
  features: {
    plugins: boolean;
    apps: string[];
  };

  // ID management API keys
  auth: AuthConfiguration;
  // SSL/HTTPS certificates
  ssl: {
    certificateFile: string;
    certificateKeyFile: string;
    certificateChainFile: string;
  };

  // Namespace for signing uuid v5 keys
  namespace: string;
}

// Public to everyone response from server to the configuration request, for security reasons
export type PublicInformation = Pick<ServerConfiguration, 'serverName' | 'port' | 'version' | 'production'> & {
  isSage3: boolean;
  logins: ServerConfiguration['auth']['strategies'];
};

// Public to authenticated users from server to the configuration request, for security reasons
export type OpenConfiguration = Pick<ServerConfiguration, 'serverName' | 'port' | 'version' | 'production' | 'namespace' | 'features'> & {
  token: string;
  admins: ServerConfiguration['auth']['admins'];
  logins: ServerConfiguration['auth']['strategies'];
  features: ServerConfiguration['features'];
  openai: ServerConfiguration['services']['openai'];
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

  // List of login strategies: guest, google, jwt, cilogon, ...
  strategies: ('google' | 'cilogon' | 'guest' | 'jwt')[];

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
}

// The Zoom Configuration
export interface ZoomSDKConfiguration {
  sdkKey: string; // API Key
  sdkSecret: string; // API Secret
}

// The OpenAI Configuration
export interface OpenAIConfiguration {
  apiKey: string; // API Key
  model: string; // LLM model
}

// AI Chat Configuration
export interface AIChatConfiguration {
  url: string;
  model: string; // LLM model
  apiKey: string; // API Key
  max_tokens: number;
}

export interface CodeLlamaConfiguration {
  url: string;
  apiKey: string;
  max_tokens: number;
}

export interface YoloConfiguration {
  url: string;
  apiKey: string;
}
