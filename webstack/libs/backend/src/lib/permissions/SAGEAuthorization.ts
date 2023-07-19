/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGEBase, SBAuthSchema, SBCollectionRef, SBJSON } from '@sage3/sagebase';
import { SAGE3Collection } from '../generics';

type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';

type Action = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

const methodActionMap = {
  POST: 'CREATE' as Action,
  GET: 'READ' as Action,
  PUT: 'UPDATE' as Action,
  DELETE: 'DELETE' as Action,
  SUB: 'READ' as Action,
  UNSUB: 'READ' as Action,
};

type RoomMembersScheme = {
  roomId: string;
  members: [];
};

type ProtectedCollection = {
  name: string;
  collection: SAGE3Collection<any>;
  rules: CollectionRule[];
};

// Used to check if the requesting user satisfies a condition on a document
type CollectionRuleByUserID = {
  ruleType: 'userId';
  property: string;
  condition: '=' | '!=' | 'includes';
  refCollection: SAGE3Collection<any>;

  allowedActions: Action[];
};

// Used to check if a property on a document is true or false
// e.g. if the document has a property 'isPublic' and it is true
type CollectionRuleByProperty = {
  ruleType: 'field';
  property: string;
  refCollection: SAGE3Collection<any>;
  allowedActions: Action[];
};

export type CollectionRule = CollectionRuleByUserID | CollectionRuleByProperty;

/**
 * SAGE Authorization
 * This class handles authorization for the SAGE3 backend
 * It is used to authorize users to perform actions on routes in the SAGERouter and SAGEWSRouter
 * Located in webstack/libs/backend/src/lib/generics
 */
class SAGEAuthorization {
  private _roomMembersCollection!: SBCollectionRef<RoomMembersScheme>;

  private _protectedCollections: ProtectedCollection[] = [];

  public async initialize() {
    this._roomMembersCollection = await SAGEBase.Database.collection<RoomMembersScheme>('ROOMMEMBERS', { roomId: '' });
  }

  public addProtectedCollection<T extends SBJSON>(collection: SAGE3Collection<T>, rules: CollectionRule[]) {
    const success = this._protectedCollections.push({ name: collection.name, collection, rules });
    if (success) {
      this.printMessage(`Added protected collection: ${collection.name}`);
    } else {
      this.printMessage(`Failed to add protected collection: ${collection.name}`);
    }
  }

  private getCollection(name: string): ProtectedCollection | undefined {
    return this._protectedCollections.find((collection) => collection.name === name);
  }

  public async authorize(method: Method, user: SBAuthSchema, collectionName: string): Promise<boolean> {
    // Check if the collection is protected
    const collection = this.getCollection(collectionName);
    if (!collection) {
      return true;
    }

    // Check for user
    const userId = user.id;
    if (!userId) {
      return false;
    }

    // Map the method to an action
    const action = methodActionMap[method];

    // Check if the user is authorized
    const allowedActions = await this.validateAllRules(collection.rules, userId);

    // If allowedActions contains the action then allow
    const allowed = allowedActions.includes(action);
    this.printMessage(`User ${userId} is ${allowed ? 'authorized' : 'unauthorized'} to ${action} ${collectionName}`);
    return allowedActions.includes(action);
  }

  private async validateAllRules(rules: CollectionRule[], userId: string): Promise<Action[]> {
    const actions = await Promise.all(rules.map((rule) => this.validateRule(rule, userId)));
    return actions.flat();
  }

  private async validateRule(rule: CollectionRule, userId: string): Promise<Action[]> {
    let allowed = false;
    if (rule.ruleType === 'userId') {
      allowed = true;
    } else if (rule.ruleType === 'field') {
      allowed = true;
    } else {
      allowed = false;
    }
    return allowed ? rule.allowedActions : [];
  }

  private printMessage(message: string) {
    console.log(`SAGEAuthorization> ${message}`);
  }
}

export const SAGEAuth = new SAGEAuthorization();
