/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { BoardSchema } from "@sage3/shared/types";
import { SAGECollection } from "@sage3/backend";

class SAGE3BoardsCollection extends SAGECollection<BoardSchema> {
  constructor() {
    super("BOARDS", {
      name: '',
      ownerId: '',
      roomId: '',
    });
  }
}

export const BoardsCollection = new SAGE3BoardsCollection();