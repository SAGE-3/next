/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// A Chat message type
type PartyChatMessage = {
  id: string; // Identifier for the message
  text: string; // The message text
  senderId: string; // The ID of the user who sent the message
  timestamp: number; // The timestamp when the message was sent (SERVERTIME)
};

// Party type definition
type Party = {
  ownerId: string; // Who Created the party
  board?: { boardId: string; roomId: string }; // The board ID and room ID for the party
};

// PartyMember type definition
type PartyMember = {
  userId: string; // The ID of the user
  party: string | null; // The ID of the party the user is in
};

// Export types
export type { PartyChatMessage, Party, PartyMember };
