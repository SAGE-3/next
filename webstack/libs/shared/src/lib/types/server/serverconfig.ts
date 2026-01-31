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
export type OpenConfiguration = Pick<
  ServerConfiguration,
  'serverName' | 'version' | 'production' | 'namespace' | 'features' | 'feedback'
> & {
  token: string;
  admins: ServerConfiguration['auth']['admins'];
  logins: ServerConfiguration['auth']['strategies'];
  features: ServerConfiguration['features'];
  models: ServerConfiguration['services']['models'];
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

// LLM Configuration

// Core type definitions
export type LLMCapability = 'chat' | 'text' | 'imagegen' | 'vision' | 'code' | 'embeddings';
export const TASK_TYPES = ['image', 'coding', 'image_generation', 'chat', 'pdf_processing'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

// Task capability requirements
export const TASK_CAPABILITIES: Record<TaskType, LLMCapability[]> = {
  image: ['vision', 'chat'],
  coding: ['code', 'chat'],
  image_generation: ['imagegen'],
  chat: ['text', 'chat'],
  pdf_processing: ['embeddings', 'chat', 'text'],
};

interface ModelConfig {
  model_id: string;
  capabilities: LLMCapability[];
  max_tokens?: number;
  context_window?: number;
  api_version?: string;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
}

interface ProviderConfig {
  apiKey?: string;
  url?: string;
  models: Record<string, ModelConfig>;
}

interface ModelReference {
  provider: string;
  models: string[];
}

interface GlobalSettings {
  default_provider: string;
  timeout_seconds: number;
  max_retries: number;
  log_requests: boolean;
}

export type LLMProviders = Record<string, ProviderConfig>;
export type LLMTasks = Record<TaskType, ModelReference>;

export interface LLMConfiguration {
  providers: LLMProviders;
  tasks: LLMTasks;
  settings: GlobalSettings;
}

// Helper class for working with the configuration
export class LLMConfigManager {
  constructor(private config: LLMConfiguration) {}

  // getModelForTask(task: TaskType): ModelReference {
  //   return this.config.tasks[task];
  // }

  getModelConfig(provider: string, model: string): ModelConfig | undefined {
    return this.config.providers[provider]?.models[model];
  }

  hasCapability(provider: string, model: string, capability: LLMCapability): boolean {
    const modelConfig = this.getModelConfig(provider, model);
    return modelConfig?.capabilities.includes(capability) ?? false;
  }

  canProviderPerformTask(provider: string, task: TaskType): boolean {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return false;

    const requiredCapabilities = TASK_CAPABILITIES[task];

    // Get all capabilities available across all models
    const allCapabilities = Object.values(providerConfig.models).flatMap((model) => model.capabilities);

    // Check if all required capabilities are present
    return requiredCapabilities.every((cap) => allCapabilities.includes(cap));
  }

  getProviderConfig(provider: string): ProviderConfig | undefined {
    return this.config.providers[provider];
  }

  estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const modelConfig = this.getModelConfig(provider, model);
    if (!modelConfig) return 0;

    const inputCost = (inputTokens / 1000) * (modelConfig.cost_per_1k_input || 0);
    const outputCost = (outputTokens / 1000) * (modelConfig.cost_per_1k_output || 0);
    return inputCost + outputCost;
  }

  /**
   * Find a model for a given provider that can perform a specific task.
   * Iterates over all models of the provider and returns the first match.
   */
  findModelForTask(provider: string, task: TaskType): ModelConfig[] {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return [];
    const requiredCapabilities = TASK_CAPABILITIES[task];

    return Object.values(providerConfig.models).filter((modelConfig) =>
      requiredCapabilities.some((cap) => modelConfig.capabilities.includes(cap)),
    );
  }
}
