/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SBJSON } from '@sage3/sagebase';
import { SAGE3Collection } from '../generics';
import { RoomMembersSchema, User, UserSchema } from '@sage3/shared/types';

import { ResourceArg, SAGE3Ability } from '@sage3/shared';

type Action = 'create' | 'read' | 'update' | 'delete';

type ProtectedCollection = {
  name: string;
  collection: SAGE3Collection<any>;
  rules: CollectionRule[];
};

type CollectionRole = 'owner' | 'admin' | 'member';

type MembershipCollection = 'ROOM_MEMBERS';

export type CollectionRule = {
  refPropName: string; // Primary Key Reference
  membershipCollection: MembershipCollection; // Collection To Reference with the Primary Key
  roles: CollectionRole[]; // What roles
  availableActions: Action[]; // What actions
};

const backendServicesNames = ['NODE_SERVER', 'PYTON_SERVER', 'SEER_SERVER'];

// export type CollectionRule = CollectionRuleUserId | CollectionRuleUserRole;

/**
 * SAGE Authorization
 * This class handles authorization for the SAGE3 backend
 * It is used to authorize users to perform actions on routes in the SAGERouter and SAGEWSRouter
 * Located in webstack/libs/backend/src/lib/generics
 */
export class SAGE3Authorization {
  private _protectedCollections: ProtectedCollection[] = [];
  private _usersCollection!: SAGE3Collection<UserSchema>;

  private _membershipCollections!: {
    ROOM_MEMBERS: SAGE3Collection<RoomMembersSchema>;
  };

  public async initialize(
    userCollection: SAGE3Collection<UserSchema>,
    roomMembersCollection: SAGE3Collection<RoomMembersSchema>
  ): Promise<void> {
    this._usersCollection = userCollection;
    this._membershipCollections = {
      ROOM_MEMBERS: roomMembersCollection,
    };
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

  public async authorize(action: Action, userId: string, collectionName: string, docInfo?: any): Promise<boolean> {
    // Check if the collection is protected
    const collection = this.getCollection(collectionName);
    if (!collection) {
      return true;
    }

    // Check for user
    if (!userId) {
      return false;
    }

    // Check if this is a backend service
    if (backendServicesNames.includes(userId)) {
      return true;
    }

    // Check for userinfo
    // Need check for SERVER or PYTHON performing action
    const userInfo = await this.getUserInfo(userId);
    if (!userInfo) {
      return false;
    }

    // Ability Check
    const resource = collection.name.toLowerCase() as ResourceArg;
    const can = SAGE3Ability.can(userInfo.data.userRole, action, resource);
    if (!can) {
      return false;
    }

    switch (action) {
      case 'create':
        return await this.authorizeCreate(userInfo, collection, docInfo);
      case 'read':
        return await this.authorizeRead(userInfo, collection, docInfo);
      case 'update':
        return await this.authorizeUpdate(userInfo, collection, docInfo);
      case 'delete':
        return await this.authorizeDelete(userInfo, collection, docInfo);
      default:
        return false;
    }
  }

  // Authorize CREATE
  public async authorizeCreate(user: User, collection: ProtectedCollection, doc: any): Promise<boolean> {
    console.log('authorizeCreate', user, collection, doc);
    const sagedoc = { data: doc };
    const createRules = collection.rules.filter((rule) => rule.availableActions.includes('create'));
    if (createRules.length === 0) return false;

    // Check if the user is a member of the membership doc
    const allowed = await this.validateAllRules(createRules, user, 'create', sagedoc);
    return allowed;
  }

  // Authorize READ
  public async authorizeRead(user: User, collection: ProtectedCollection, docId: string): Promise<boolean> {
    return true;
  }

  // Authorize UPDATE
  public async authorizeUpdate(user: User, collection: ProtectedCollection, docId: string): Promise<boolean> {
    const updateRules = collection.rules.filter((rule) => rule.availableActions.includes('update'));
    if (updateRules.length === 0) return false;
    const doc = await collection.collection.get(docId, 'NODE_SERVER');
    if (!doc) return false;
    const allowed = await this.validateAllRules(updateRules, user, 'update', doc);
    return allowed;
  }

  // Authorize DELETE
  public async authorizeDelete(user: User, collection: ProtectedCollection, docId: string): Promise<boolean> {
    return true;
  }

  // Validate a User's role against all Protected Collection Rules
  private async validateAllRules(rules: CollectionRule[], user: User, action: Action, doc: any): Promise<boolean> {
    const allowed = await Promise.all(rules.map((rule) => this.validateRule(rule, user, action, doc)));
    return allowed.includes(true);
  }

  // Validate a User's role against a Protected Collection Rule
  private async validateRule(rule: CollectionRule, user: User, action: Action, doc: any): Promise<boolean> {
    // Get the refId from the doc
    const refId = doc.data[rule.refPropName];
    if (!refId) {
      return false;
    }

    // Get the membership collection
    const membershipCollection = this._membershipCollections[rule.membershipCollection];
    if (!membershipCollection) {
      return false;
    }

    // Get the membership docs
    const membershipDocs = await membershipCollection.query(rule.refPropName as any, refId, 'NODE_SERVER');
    if (!membershipDocs) {
      return false;
    }

    // Get the membership doc
    const membershipDoc = membershipDocs[0];
    if (!doc) {
      return false;
    }

    // Check if the user is a member of the membership doc
    const userMembership = membershipDoc.data.members.find((member) => member.userId === user._id);
    if (!userMembership) {
      return false;
    }

    // Check if the user's role is allowed for the action
    const allowed = rule.roles.includes(userMembership.role) && rule.availableActions.includes(action);
    return allowed;
  }

  private async getUserInfo(id: string): Promise<User | undefined> {
    const user = await this._usersCollection.get(id, 'NODE_SERVER');
    return user;
  }

  private printMessage(message: string) {
    console.log(`SAGEAuthorization> ${message}`);
  }
}

export const SAGEAuthorization = new SAGE3Authorization();
