/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Twilio, jwt } from 'twilio';

import { TwilioConfiguration } from "@sage3/shared/types"

const AccessToken = jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

/**
 * SAGE Server Twilio Helper Class
 */
export class SAGETwilio {
  private config: TwilioConfiguration;

  constructor(config: TwilioConfiguration) {
    this.config = config;
    new Twilio(config.accountSid, config.authToken);
  }

  /**
   * Generate a Twilio Token for the given user for the given roomId
   * @param userId The user id to generate a token for
   * @param videoRoomId The Twilio roomId the user is attempting to join
   * @returns 
   */
  public generateVideoToken(userId: string, roomId: string) {

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const token = new AccessToken(
      this.config.accountSid,
      this.config.apiKey,
      this.config.apiSecret
    );

    // Assign identity to the token
    token.identity = userId;

    // Grant the access token Twilio Video capabilities
    const grant = new VideoGrant();
    grant.room = roomId;
    token.addGrant(grant);

    // Serialize the token to a JWT string
    return token.toJwt();
  }

}