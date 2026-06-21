/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// LLM Configuration

// Core type definitions
export type LLMCapability = 'chat' | 'imagegen' | 'vision' | 'code' | 'embeddings';
export const TASK_TYPES = ['image', 'coding', 'image_generation', 'chat', 'pdf_processing'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

// Task capability requirements
export const TASK_CAPABILITIES: Record<TaskType, LLMCapability[]> = {
  image: ['vision'],
  coding: ['code'],
  image_generation: ['imagegen'],
  chat: ['chat'],
  pdf_processing: ['embeddings', 'chat'],
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

/**
 * Produce a client-safe copy of the LLM configuration. Strips secrets
 * (apiKey) and internal endpoints (url) from every provider, keeping only the
 * information the frontend needs to reason about capabilities (model names,
 * capabilities, task mapping, default provider). Use this before sending the
 * configuration to browsers.
 */
export function sanitizeLLMConfiguration(config: LLMConfiguration): LLMConfiguration {
  const providers: LLMProviders = {};
  for (const [name, provider] of Object.entries(config?.providers || {})) {
    // Drop apiKey and url; keep only the (non-secret) model descriptors
    providers[name] = { models: provider.models };
  }
  return {
    providers,
    tasks: config?.tasks,
    settings: config?.settings,
  } as LLMConfiguration;
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
