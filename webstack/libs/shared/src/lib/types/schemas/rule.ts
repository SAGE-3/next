/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const schema = z.object({
  // The id of the ref which this rule applies
  refId: z.string(),
  // Which collection does the ref belong to
  refCollection: z.string(),
  // The id of the owner of the ref
  ownerId: z.string(),
  // Is the ref private or public
  private: z.boolean(),

  // Moderators of the ref
  moderators: z.array(z.string()),
  // Settings for the moderators
  moderatorsSettings: z.object({
    // Can moderators add members to the rule
    addMembers: z.boolean(),
    // Can moderators remove members from the rule
    removeMembers: z.boolean(),
    // Can moderators update the ref
    updateRef: z.boolean(),

    // These apply to children of the ref
    // (i.e) Create boards within a Room
    // (i.e) Create apps within a Board
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),

  // Collaborators of the ref
  collaborators: z.array(z.string()),
  // Settings for the collaborators
  collaboratorSettings: z.object({
    // Can collaborators add members to the rule
    addMembers: z.boolean(),
    // Can collaborators remove members from the rule
    removeMembers: z.boolean(),
    // Can collaborators update the ref
    updateRef: z.boolean(),

    // These apply to children of the ref
    // (i.e) Create boards within a Room
    // (i.e) Create apps within a Board
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),

  // Viewers of the ref
  viewers: z.array(z.string()),
  // Settings for the viewers
  viewersSettings: z.object({
    // Can viewers add members to the rule
    addMembers: z.boolean(),
    // Can viewers remove members from the rule
    removeMembers: z.boolean(),
    // Can viewers update the ref
    updateRef: z.boolean(),

    // These apply to children of the ref
    // (i.e) Create boards within a Room
    // (i.e) Create apps within a Board
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),
});

export type RuleSchema = z.infer<typeof schema>;

export type Rules = SBDoc & { data: RuleSchema };
