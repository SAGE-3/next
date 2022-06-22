/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppSchema } from "@sage3/applications/schema";
import { SAGE3Collection } from "@sage3/backend";

class SAGE3AppsCollection extends SAGE3Collection<AppSchema> {

  constructor() {
    super("APPS", {
      name: "",
      ownerId: "",
      roomId: "",
      boardId: "",
    });
  }
}

export const AppsCollection = new SAGE3AppsCollection();