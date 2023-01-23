/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Application specific schema
import { AppState, AppSchema, App } from '@sage3/applications/schema';

// Hooks and stores
import { useAppStore } from './app';
import { useAuth, useUser } from '../hooks';

// CASL
import { PureAbility, AbilityBuilder, MatchConditions } from '@casl/ability';

/*
1- useApplicationStore (React Hook)
2- Inside useApplicationStore call useAppStore and useUser
3- The hook provides {apps, update, updateState} from the useAppStore Zustand
   a- But inside there you can use the useUser hook to process middleware style processing
4- Inside applications call useApplicationStore
*/

/**
 * Hook to use the application store with authorization
 *
 * @export
 * @param {App} app
 * @returns createApp, updateApp, updateStateApp, deleteApp, canApp
 */
export function useAuthorizationStore(app: App | undefined) {
  const create = useAppStore((state) => state.create);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const deletion = useAppStore((state) => state.delete);

  const { user } = useUser();
  const { auth } = useAuth();

  // Permissions
  const ability = defineAbilityFor(auth?.provider === 'guest' ? 'guest' : 'user', user?._id);

  function updateApp(id: string, updates: Partial<AppSchema>) {
    if (!app) return;
    if (ability.can('modify', { ...app, modelName: 'App' })) {
      update(id, updates);
    }
  }

  function canApp(operation: AuthAction = 'modify') {
    if (!app) return false;
    return ability.can(operation, { ...app, modelName: 'App' });
  }

  function updateStateApp(id: string, state: Partial<AppState>) {
    if (!app) return;
    if (ability.can('modify', { ...app, modelName: 'App' })) {
      updateState(id, state);
    }
  }
  function createApp(newApp: AppSchema) {
    if (!app) return;
    if (ability.can('create', { ...app, modelName: 'App' })) {
      create(newApp);
    }
  }
  function deleteApp(id: string) {
    if (!app) return;
    if (ability.can('delete', { ...app, modelName: 'App' })) {
      deletion(id);
    }
  }

  return { createApp, updateApp, updateStateApp, deleteApp, canApp };
}

// Seems necessary to define when using types
const lambdaMatcher = (matchConditions: MatchConditions) => matchConditions;

// Type to add a type for CASL
type caslApp = App & { modelName: 'App' };

// What are the actions: manage is a builtin alias
type AuthAction = 'manage' | 'move' | 'resize' | 'delete' | 'create' | 'modify';
// What are the subjects: all is a builtin alias
type AuthSubject = 'all' | caslApp | 'App' | 'asset' | 'room' | 'board';
type AppAbility = PureAbility<[AuthAction, AuthSubject]>;

/**
 * Define the ability of a user to perform an action on a resource
 * The ability is based on the user's role and on the resource type
 *
 * @param {string} role
 * @param {(string | undefined)} userId
 * @returns
 */
function defineAbilityFor(role: string, userId: string | undefined) {
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
    // operations on apps
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
