/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppSchema, AppState } from "@sage3/applications/schema";
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

  public async updateState(id: string, update: Partial<AppState>): Promise<boolean> {
    try {
      const currentState = await this.collection.docRef(id).read();
      if (!currentState) return false;
      const updatedState = { ...currentState.data.state, ...update };
      const response = await this.collection.docRef(id).update({ state: updatedState });
      return response.success;
    } catch (error) {
      this.printError(error);
      return false;
    }
  }
}

export const AppsCollection = new SAGE3AppsCollection();