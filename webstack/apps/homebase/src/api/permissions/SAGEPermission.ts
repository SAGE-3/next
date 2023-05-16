import { SAGE3Collection } from '@sage3/backend';
import { SBJSON } from '@sage3/sagebase';
import { BoardSchema, RoomSchema, UserSchema } from '@sage3/shared/types';
import { AppsCollection, BoardsCollection, RoomsCollection } from '../collections';
import { AppSchema } from '@sage3/applications/schema';

type Action = 'create' | 'read' | 'update' | 'delete';
type Role = UserSchema['userRole'];
type Resource<T extends SBJSON> = { name: string; collection: SAGE3Collection<T> };

type Ability = { role: Role[]; action: Action[]; resource: Resource<SBJSON>[] };

type Rule<T extends SBJSON> = { resource: Resource<T>; field: keyof T; condition: '=' | 'includes' };
type Access = { resource: Resource<SBJSON>; action: Action[]; rules: Rule<SBJSON>[]; allRules: boolean };

type PermissionConfig = {
  resources: Resource<SBJSON>[];
  abilites: Ability[];
  access: Access[];
};

const appResource: Resource<AppSchema> = { name: 'apps', collection: AppsCollection };
const boardResource: Resource<BoardSchema> = { name: 'boards', collection: BoardsCollection };
const roomResource: Resource<RoomSchema> = { name: 'rooms', collection: RoomsCollection };

const Perm: PermissionConfig = {
  resources: [appResource, boardResource, roomResource],
  abilites: [
    { role: ['admin'], action: ['create', 'read', 'update', 'delete'], resource: [appResource, boardResource, roomResource] },
    { role: ['user'], action: ['create', 'read', 'update', 'delete'], resource: [appResource, boardResource, roomResource] },
    { role: ['guest', 'spectator'], action: ['read'], resource: [appResource, boardResource, roomResource] },
    { role: ['guest'], action: ['update'], resource: [appResource] },
  ],
  access: [
    {
      resource: boardResource,
      action: ['create'],
      allRules: false,
      rules: [
        { resource: roomResource, field: 'members', condition: 'includes' } as Rule<RoomSchema>,
        { resource: roomResource, field: 'ownerId', condition: '=' } as Rule<RoomSchema>,
      ],
    },
    {
      resource: boardResource,
      action: ['update'],
      allRules: true,
      rules: [{ resource: roomResource, field: 'ownerId', condition: '=' } as Rule<RoomSchema>],
    },
  ],
};

class SAGEPermission {
  private _config: PermissionConfig;
  constructor(config: PermissionConfig) {
    this._config = config;
  }

  // Check if the user can perform the action
  public async can(role: Role, action: Action, resource: string) {
    // Filter the abilities for the role, action, and resource
    const abilities = this._config.abilites.filter(
      (ability) => ability.role.includes(role) && ability.action.includes(action) && ability.resource.find((el) => el.name === resource)
    );
    if (abilities.length === 0) {
      return false;
    }
    return true;
  }

  // Check if the user is authorized to perform the action
  public async allowed(role: Role, action: Action, resource: string, resource_id: string, check_value: string | number) {
    // Check if they can first
    const can = await this.can(role, action, resource);
    if (!can) {
      return false;
    }
    // Filter the access for the resource
    const access = this._config.access.filter((acc) => acc.resource.name === resource);
    // If there are no access rules then allow
    if (access.length === 0) {
      return true;
    }
    // Check if the user is authorized
    await Promise.all(
      access.map(async (acc) => {
        // Get the rules for the access
        const rules = acc.rules;
        // Check if the user is authorized for all the rules
        const authorized = await Promise.all(
          rules.map(async (rule) => {
            // Get the value of the field
            const doc = await acc.resource.collection.get(resource_id);
            // If no document then reject
            if (!doc) {
              return false;
            }
            // Get the value of the field
            const value = doc.data[rule.field];
            // If no value then reject
            if (!value) {
              return false;
            }
            // Check if the value matches the rule
            if (rule.condition === '=') {
              return value === check_value;
            } else if (Array.isArray(value) && rule.condition === 'includes') {
              return value.includes(check_value);
            } else {
              return false;
            }
          })
        );
        // If the user is authorized for all the rules then allow
        if (acc.allRules) {
          return authorized.every((auth) => auth);
        } else {
          return authorized.some((auth) => auth);
        }
      })
    );
  }
}
