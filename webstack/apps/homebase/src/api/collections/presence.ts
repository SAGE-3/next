/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { PresenceSchema } from "@sage3/shared/types";
import { SAGE3Collection, sageRouter } from "@sage3/backend";

class SAGE3PresenceCollection extends SAGE3Collection<PresenceSchema> {

  constructor() {
    super("PRESENCE", {
      userId: '',
      status: 'online',
      roomId: '',
      boardId: '',
    });
    const router = sageRouter<PresenceSchema>(this);

    router.post('/create', async ({ body, user }, res) => {
      let doc = null;
      const id = (user as any).id;
      if (user) { doc = await this.add(body, id, id); }
      if (doc) res.status(200).send({ success: true, data: [doc] });
      else res.status(500).send({ success: false, message: "Failed to create presence." });
    });

    this.httpRouter = router;
  }
}

export const PresenceCollection = new SAGE3PresenceCollection();