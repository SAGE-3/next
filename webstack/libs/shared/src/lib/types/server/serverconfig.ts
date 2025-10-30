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
  // Webserver configuration
  webserver: {
    logLevel: 'all' | 'partial' | 'none';
    uploadLimit: string; // in bytes with optional units (KB, MB, GB, TB)
  };

  // Feedback server
  feedback: { url: string };

  // External Services
  services: {
    twilio: TwilioConfiguration;
    openai: OpenAIConfiguration;
    llama: LlamaConfiguration;
    azure: AzureConfig;
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
export type OpenConfiguration = Pick<
  ServerConfiguration,
  'serverName' | 'version' | 'production' | 'namespace' | 'features' | 'feedback'
> & {
  token: string;
  admins: ServerConfiguration['auth']['admins'];
  logins: ServerConfiguration['auth']['strategies'];
  features: ServerConfiguration['features'];
  openai: ServerConfiguration['services']['openai'];
  llama: ServerConfiguration['services']['llama'];
  azure: ServerConfiguration['services']['azure'];
  fluentd: ServerConfiguration['fluentd'];
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

// The Twilio Configuration
export interface TwilioConfiguration {
  accountSid: string; // Your Account SID from www.twilio.com/console
  apiKey: string; // API Key
  apiSecret: string; // API Secret
}

// The OpenAI Configuration
export interface OpenAIConfiguration {
  apiKey: string; // API Key
  model: string; // LLM model
  label?: string; // Model label in the UI
}

// Llama Configuration
export interface LlamaConfiguration {
  url: string;
  model: string; // LLM model
  apiKey: string; // API Key
  max_tokens: number;
  label?: string; // Model label in the UI
}

// Azure Configuration
export type AzureServiceConfig = {
  url: string;
  model: string;
  apiKey: string;
  api_version: string;
  label?: string; // Model label in the UI
};

export type AzureConfig = {
  text: AzureServiceConfig;
  embedding: AzureServiceConfig;
  transcription: AzureServiceConfig;
  reasoning: AzureServiceConfig;
  vision: AzureServiceConfig;
};
