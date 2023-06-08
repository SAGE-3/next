import { SAGE3Collection } from '@sage3/backend';
import { UserSchema } from '@sage3/shared/types';
import { AppsCollection, BoardsCollection, RoomsCollection } from '../collections';

type Action = 'create' | 'read' | 'update' | 'delete' | 'all';
type ActionArg = 'create' | 'read' | 'update' | 'delete';
type Role = UserSchema['userRole'] | 'all';
type RoleArg = 'admin' | 'user' | 'guest' | 'spectator';
type Resource = { name: string; collection: SAGE3Collection<any> };

type Ability = { role: Role[]; action: Action[]; resource: Resource[] };

type Rule = { resource: Resource; field: string; condition: '=' | 'includes'; ref_prop?: string };
type Access = { resource: Resource; action: Action[]; rules: Rule[]; allRules: boolean };

type PermissionConfig = {
  resources: Resource[];
  abilites: Ability[];
  access: Access[];
};

const appResource: Resource = { name: 'apps', collection: AppsCollection };
const boardResource: Resource = { name: 'boards', collection: BoardsCollection };
const roomResource: Resource = { name: 'rooms', collection: RoomsCollection };

const Perm: PermissionConfig = {
  resources: [appResource, boardResource, roomResource],
  abilites: [
    { role: ['admin'], action: ['all'], resource: [appResource, boardResource, roomResource] },
    { role: ['user'], action: ['all'], resource: [appResource, boardResource, roomResource] },
    { role: ['guest', 'spectator'], action: ['read'], resource: [appResource, boardResource, roomResource] },
    { role: ['guest'], action: ['update'], resource: [appResource] },
  ],
  access: [
    {
      resource: boardResource,
      action: ['create'],
      allRules: false,
      rules: [
        { resource: roomResource, field: 'members', condition: 'includes' },
        { resource: roomResource, field: 'ownerId', condition: '=' },
      ],
    },
    {
      resource: boardResource,
      action: ['update'],
      allRules: true,
      rules: [{ resource: roomResource, field: 'ownerId', condition: '=' }],
    },
  ],
};

class SAGEPermission {
  private _config: PermissionConfig;
  constructor(config: PermissionConfig) {
    this._config = config;
  }
  // Check ability
  private checkAbility(role: RoleArg, action: ActionArg, resource: string, ability: Ability) {
    // Check if the role is allowed
    if (!ability.role.includes('all') && !ability.role.includes(role)) {
      return false;
    }
    // Check if the action is allowed
    if (!ability.action.includes('all') && !ability.action.includes(action)) {
      return false;
    }
    // Check if the resource is allowed
    if (!ability.resource.find((el) => el.name === resource)) {
      return false;
    }
    return true;
  }

  // Check if the user can perform the action
  public can(role: RoleArg, action: ActionArg, resource: string) {
    // Filter the abilities for the role, action, and resource
    const abilities = this._config.abilites.filter((ability) => this.checkAbility(role, action, resource, ability));
    if (abilities.length === 0) {
      return false;
    }
    return true;
  }

  // Check if the user is authorized to perform the action on the specified resource
  // Resource_id is the id of the resource
  // Check_value is the value to check against
  public async allowed(role: RoleArg, action: ActionArg, resource: string, resource_id: string, check_value: string | number) {
    // Check if they can first
    const can = this.can(role, action, resource);
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

export const SAGEPermissionInstance = new SAGEPermission(Perm);
