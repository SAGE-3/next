/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useMemo } from 'react';

import { useConfigStore, useUserSettings, withUserProvider } from '@sage3/frontend';
import { LLMConfigManager } from '@sage3/shared/types';

/**
 * The AI provider comes from the user's global setting, resolved against the
 * server's LLM configuration (mirrors the Chat app). The provider name is sent
 * to Seer, which maps it to a concrete model per task; capability checks gate
 * features the provider can't do (e.g. image input / image generation).
 */
export function useAiProvider() {
  const serverConfig = useConfigStore((state) => state.config);
  const llmManager = useMemo(
    // Include the user's own provider so its capabilities gate tasks like any other
    () => (serverConfig?.models ? new LLMConfigManager(withUserProvider(serverConfig.models)) : undefined),
    [serverConfig]
  );
  const { settings } = useUserSettings();
  const aiProvider = settings.aiModel || serverConfig?.models?.settings?.default_provider || '';
  return { aiProvider, llmManager };
}
