/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { LiveKitConfiguration } from '@sage3/shared/types';
import { AppSchema } from '@sage3/applications/schema';
import { SAGE3Collection } from '../generics';

import { AccessToken, WebhookReceiver } from 'livekit-server-sdk';

// The screenshare app type handled by LiveKit
const SCREENSHARE_TYPE = 'LocalScreenshare';

/**
 * Generate a LiveKit room join token
 * @param config The LiveKit configuration
 * @param identity The participant identity (userId--accessId)
 * @param roomId The LiveKit roomId (a SAGE3 board id) the user is attempting to join
 * @returns The signed JWT
 */
export function generateLiveKitToken(config: LiveKitConfiguration, identity: string, roomId: string): Promise<string> {
  const token = new AccessToken(config.apiKey, config.apiSecret, { identity });
  token.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true });
  return token.toJwt();
}

/**
 * SAGE Server LiveKit Helper Class
 * Mints room join tokens for the self-hosted LiveKit SFU used for screensharing,
 * and cleans up screenshare apps from LiveKit webhook events.
 */
export class SAGELiveKit {
  private config: LiveKitConfiguration;
  private apps: SAGE3Collection<AppSchema>;
  private receiver: WebhookReceiver;

  /**
   * @param config LiveKit config
   * @param appCollection The apps collection
   * @param clearAppsInterval How often to sweep for screenshare apps that have expired (ms)
   * @param expiration How long can screenshare apps live before they expire (ms)
   */
  constructor(config: LiveKitConfiguration, appCollection: SAGE3Collection<AppSchema>, clearAppsInterval: number, expiration: number) {
    this.config = config;
    this.apps = appCollection;
    this.receiver = new WebhookReceiver(config.apiKey, config.apiSecret);
    this.clearExpiredApps(clearAppsInterval, expiration);
  }

  /**
   * Generate a LiveKit room join token for the given identity for the given roomId
   */
  public generateVideoToken(identity: string, roomId: string): Promise<string> {
    return generateLiveKitToken(this.config, identity, roomId);
  }

  /**
   * Handle a webhook event from the LiveKit server.
   * Published tracks are named after their screenshare app id, so when a track
   * disappears (publisher stopped, disconnected, crashed) the app is deleted immediately.
   * @param body The raw request body (signature is verified against it)
   * @param authHeader The Authorization header of the request
   */
  public async handleWebhook(body: string, authHeader?: string): Promise<void> {
    const event = await this.receiver.receive(body, authHeader);
    if (event.event === 'track_unpublished' && event.track?.name) {
      // Track names are the screenshare app ids
      const app = await this.apps.get(event.track.name);
      if (app && app.data.type === SCREENSHARE_TYPE) {
        await this.apps.delete(app._id);
      }
    } else if (event.event === 'room_finished' && event.room?.name) {
      // Room names are board ids: the board's room ended, remove its screenshare apps
      const boardApps = await this.apps.query('boardId', event.room.name);
      if (boardApps) {
        await Promise.all(boardApps.filter((app) => app.data.type === SCREENSHARE_TYPE).map((app) => this.apps.delete(app._id)));
      }
    }
  }

  /**
   * Safety net: clear screenshare apps that have exceeded the time limit.
   * Regular cleanup (publisher stops, leaves, disconnects) is webhook-driven.
   */
  private clearExpiredApps(interval: number, expiration: number) {
    setInterval(async () => {
      const apps = await this.apps.query('type', SCREENSHARE_TYPE);
      if (apps) {
        const now = Date.now();
        apps.forEach((app) => {
          if (now - app._createdAt > expiration) {
            this.apps.delete(app._id);
          }
        });
      }
    }, interval);
  }
}
