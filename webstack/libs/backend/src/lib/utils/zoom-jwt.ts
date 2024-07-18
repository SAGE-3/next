/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ZoomSDKConfiguration } from '@sage3/shared/types';

import { KJUR } from 'jsrsasign';

/**
 * SAGE Server Twilio Helper Class
 */
export class SAGEZoomJWTHelper {
  private config: ZoomSDKConfiguration;

  /**
   *
   * @param config Zoom config file
   */
  constructor(config: ZoomSDKConfiguration) {
    this.config = config;
  }

  /**
   * Generate a Twilio Token for the given user for the given roomId
   * @param userId The user id to generate a token for
   * @param videoRoomId The Twilio roomId the user is attempting to join
   * @returns
   */
  public generateVideoToken(userId: string, roomId: string) {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
      app_key: this.config.sdkKey,
      tpc: roomId,
      role_type: 0,
      version: 1,
      iat: iat,
      exp: exp,
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, this.config.sdkSecret);
    return sdkJWT;
  }

  public generateMeetingToken(meeting: number, role: number) {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
      sdkKey: this.config.meetingSDKKey,
      appKey: this.config.meetingSDKKey,
      mn: meeting,
      role: role,
      iat: iat,
      exp: exp,
      tokenExp: exp,
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, this.config.meetingAppKey);
    return sdkJWT;
  }
}
