/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ScreenshareBackend } from '@sage3/shared/types';
import { useConfigStore } from '../stores';

/**
 * Which screenshare backend this server offers: 'livekit', 'twilio', or 'none'.
 * The server derives it from its own credentials, so the UI never offers a
 * screenshare the server cannot actually provide.
 */
export function useScreenshareBackend(): ScreenshareBackend {
  return useConfigStore((state) => state.config?.features?.screenshare) ?? 'none';
}
