/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SBAuthSchema, SBJSON } from '@sage3/sagebase';
import { SAGE3Collection } from '../generics';
import { RoomMembersSchema, User, UserSchema } from '@sage3/shared/types';

import { ResourceArg, SAGE3Ability } from '@sage3/shared';

type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';

type Action = 'create' | 'read' | 'update' | 'delete';

const methodActionMap = {
  POST: 'create' as Action,
  GET: 'read' as Action,
  PUT: 'update' as Action,
  DELETE: 'delete' as Action,
  SUB: 'read' as Action,
  UNSUB: 'read' as Action,
};

type ProtectedCollection = {
  name: string;
  collection: SAGE3Collection<any>;
  rules: CollectionRule[];
};

export type CollectionRule = {
  refId_By_DocPropName: string;
  collection: string;
  roles: ('owner' | 'admin' | 'member')[];
  checkActions: Action[];
};

// export type CollectionRule = CollectionRuleUserId | CollectionRuleUserRole;

/**
 * SAGE Authorization
 * This class handles authorization for the SAGE3 backend
 * It is used to authorize users to perform actions on routes in the SAGERouter and SAGEWSRouter
 * Located in webstack/libs/backend/src/lib/generics
 */
class SAGEAuthorization {
  private _protectedCollections: ProtectedCollection[] = [];

  private _usersCollection!: SAGE3Collection<UserSchema>;
  private _roomMembersCollection!: SAGE3Collection<RoomMembersSchema>;

  public async initialize(
    userCollection: SAGE3Collection<UserSchema>,
    roomMembersCollection: SAGE3Collection<RoomMembersSchema>
  ): Promise<void> {
    this._usersCollection = userCollection;
    this._roomMembersCollection = roomMembersCollection;
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

  public async authorize(method: Method, user: SBAuthSchema, collectionName: string, docId: string): Promise<boolean> {
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
    // Check for userinfo
    // Need check for SERVER or PYTHON performing action
    const userInfo = await this.getUserInfo(userId);
    if (!userInfo) {
      return false;
    }

    // Map the method to an action
    const action = methodActionMap[method];

    // Ability Check
    const resource = collection.name.toLowerCase() as ResourceArg;
    const can = SAGE3Ability.can(userInfo.data.userRole, action, resource);
    if (!can) {
      return false;
    }

    // Check if the user is authorized for the action
    const allowed = await this.validateAllRules(collection.rules, userInfo, docId);

    // If allowedActions contains the action then allow
    this.printMessage(`User ${userId} is ${allowed ? 'authorized' : 'unauthorized'} to ${action} ${collectionName}`);
    return allowed;
  }

  private async validateAllRules(rules: CollectionRule[], user: User, doc: any): Promise<boolean> {
    const allowed = await Promise.all(rules.map((rule) => this.validateRule(rule, user, doc)));
    return allowed.includes(true);
  }

  private async validateRule(rule: CollectionRule, user: User, doc: any): Promise<boolean> {
    // let allowed = false;
    // if (rule.ruleType === 'userId') {
    //   allowed = true;
    // } else if (rule.ruleType === 'field') {
    //   allowed = true;
    // } else {
    //   allowed = false;
    // }
    // return allowed ? rule.allowedActions : [];
    return true;
  }

  private async getUserInfo(id: string): Promise<User | undefined> {
    const user = await this._usersCollection.get(id);
    return user;
  }

  private printMessage(message: string) {
    console.log(`SAGEAuthorization> ${message}`);
  }
}

export const SAGEAuth = new SAGEAuthorization();
