import { PureAbility, AbilityBuilder, MatchConditions } from '@casl/ability';

import { App } from '../schema';

type caslApp = App & { modelName: 'App' };

// What are the actions: manage is a builtin alias
export type AuthAction = 'manage' | 'move' | 'resize' | 'delete' | 'create' | 'modify';
// What are the subjects: all is a builtin alias
export type AuthSubject = 'all' | caslApp | 'App' | 'asset' | 'room' | 'board';
type AppAbility = PureAbility<[AuthAction, AuthSubject]>;

// Seems necessary to define when using types
const lambdaMatcher = (matchConditions: MatchConditions) => matchConditions;

/**
 * Define the ability of a user to perform an action on a resource
 * The ability is based on the user's role and on the resource type
 *
 * @export
 * @param {string} role
 * @param {(string | undefined)} userId
 * @returns
 */
export function defineAbilityFor(role: string, userId: string | undefined) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

  // Limit the guest accounts
  if (role === 'admin') {
    can('manage', 'all');
  } else if (role === 'user') {
    // no room management (artificial limitation to test system)
    // but everything else
    can('manage', ['App', 'asset', 'board']);
  } else if (role === 'guest') {
    // create apps and modify/manipulate own apps
    can(['create'], ['App']);
    // operations on own apps
    can(['modify', 'delete', 'move', 'resize'], 'App', (app: App) => app._createdBy === userId);
  } else if (role === 'viewer') {
    // sit back and watch
    cannot(['create', 'modify', 'delete', 'move', 'resize'], 'all');
  }

  return build({
    detectSubjectType: (object: any) => {
      // use the modelName field to determine the subject type
      return typeof object === 'string' ? object : object.modelName;
    },
    // @ts-ignore
    conditionsMatcher: lambdaMatcher,
  });
}
