/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RoomSchema } from "@sage3/shared/types";
import { SAGE3Collection, sageRouter } from "@sage3/backend";

class SAGE3RoomsCollection extends SAGE3Collection<RoomSchema> {
  constructor() {
    super("ROOMS", {
      name: '',
      ownerId: '',
    });

    const router = sageRouter<RoomSchema>(this);
    this.httpRouter = router;
  }
}

export const RoomsCollection = new SAGE3RoomsCollection();