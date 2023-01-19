import { PureAbility, AbilityBuilder, MatchConditions } from '@casl/ability';

import { App } from '../schema';

type caslApp = App & { modelName: 'App' };

// What are the actions
export type AuthAction = 'manage' | 'manipulation' | 'delete' | 'create' | 'modify';
// What are the subjects
export type AuthSubject = caslApp | 'App' | 'asset' | 'room' | 'board' | 'all';
type AppAbility = PureAbility<[AuthAction, AuthSubject]>;

// Seems necessary to define when using types
const lambdaMatcher = (matchConditions: MatchConditions) => matchConditions;

/**
 * Main function to define the abilities
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
    can(['modify', 'delete', 'manipulation'], 'App', (app: App) => app._createdBy === userId);
  } else if (role === 'viewer') {
    // sit back and watch
    cannot(['create', 'modify', 'delete', 'manipulation'], 'all');
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
