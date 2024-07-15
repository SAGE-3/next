/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

// Gather all the schemas from source code (since not exported)

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const RotationSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
  depth: z.number(),
});

export const AppZodSchema = z.object({
  title: z.string(),
  roomId: z.string(),
  boardId: z.string(),
  position: PositionSchema,
  size: SizeSchema,
  rotation: RotationSchema,
  type: z.string(), // AppName,
  state: z.any(), // AppState,
  raised: z.boolean(),
});

export const BoardSchema = z.object({
  // Name of the board
  name: z.string(),
  // Description of the board.
  description: z.string(),
  // Color of the board.
  color: z.string(),
  // The id of the room the board belongs to
  roomId: z.string(),
  // The id of the owner of the room
  ownerId: z.string(),
  // Is the board password protected?
  isPrivate: z.boolean(),
  privatePin: z.string(),
  // The lines on the board
  whiteboardLines: z.any(),
});

export const ImageInfoSchema = z.object({
  url: z.string(),
  format: z.string(),
  size: z.number(),
  width: z.number(),
  height: z.number(),
  channels: z.number(),
  premultiplied: z.boolean(),
});
// Create the Typescript type
export type ImageInfoType = z.infer<typeof ImageInfoSchema>;

// information for derived images
export const ExtraImageSchema = z.object({
  fullSize: z.string(),
  width: z.number(),
  height: z.number(),
  aspectRatio: z.number(),
  filename: z.string(),
  url: z.string(),
  sizes: z.array(ImageInfoSchema),
});
// Create the Typescript type
export type ExtraImageType = z.infer<typeof ExtraImageSchema>;

// information for derived PDF:
//   array of pages with array of images
export const ExtraPDFSchema = z.array(z.array(ImageInfoSchema));
// Create the Typescript type
export type ExtraPDFType = z.infer<typeof ExtraPDFSchema>;

export const AssetSchema = z.object({
  file: z.string(),
  owner: z.string(),
  room: z.string(),
  originalfilename: z.string(),
  path: z.string(),
  dateCreated: z.string(),
  dateAdded: z.string(),
  mimetype: z.string(),
  destination: z.string(),
  size: z.number(),
  metadata: z.string().optional(),
  derived: z.union([ExtraImageSchema, ExtraPDFSchema]).optional(),
});

export const RoomSchema = z.object({
  // Name of the Room
  name: z.string(),
  // Description of the room.
  description: z.string(),
  // Color of the room.
  color: z.string(),
  // The ID of the owner of the room
  ownerId: z.string(),
  // Is the room private or public
  isPrivate: z.boolean(),
  privatePin: z.string(),
  // Is the board listed publicly?
  isListed: z.boolean(),
});

const UserType = z.enum(['wall', 'client']);
export type UserType = z.infer<typeof UserType>;

const UserRole = z.enum(['admin', 'user', 'guest']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  // Name of the user
  name: z.string(),
  // Email address of the user.
  email: z.string(),
  // Color representing the user.
  color: z.string(),
  // Picture of the user.
  profilePicture: z.string(),
  // Type of the user.
  userType: UserType,
  // Role of the user in SAGE3
  userRole: UserRole,
});

/**
 * SAGE3 MessageSchema
 * @interface MessageSchema
 */
export const MessageSchema = z.object({
  type: z.string(),
  payload: z.string(),
});

const Status = z.enum(['online', 'away', 'offline']);
export type Status = z.infer<typeof Status>;

/**
 * SAGE3 PresenceSchema
 * @interface PresenceSchema
 */
export const PresenceSchema = z.object({
  // Id of the user, Reference to a Auth.id => User => Presence
  userId: z.string(),
  // The status of the user
  status: Status,
  // The roomId the user is located
  roomId: z.string(),
  // The boardId the user is located
  boardId: z.string(),
  // Cursor of the user
  cursor: PositionSchema,
  // Viewport of the user
  viewport: z.object({
    position: PositionSchema,
    size: SizeSchema,
  }),
});
