/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// The JS version of Zustand
import createVanilla from 'zustand/vanilla';

// The React Version of Zustand
import createReact from 'zustand';

// Application specific schema
import { AppState, AppSchema, App } from '@sage3/applications/schema';
// User specific schema
import { User, UserSchema } from '@sage3/shared/types';

// Other stores
import { useAppStore } from './app';
import { useAuth, useUser } from '../hooks';

// CASL
import { PureAbility, AbilityBuilder } from '@casl/ability';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

/*
1- useApplicationStore (React Hook)
2- Inside useApplicationStore call useAppStore and useUser
3- The hook provides {apps, update, updateState} from the useAppStore Zustand
   a- But inside there you can use the useUser hook to process middleware style processing
4- Inside applications call useApplicationStore
*/

export function useAuthorizationStore() {
  const create = useAppStore((state) => state.create);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const deletion = useAppStore((state) => state.delete);

  // const { user } = useUser();
  const { auth } = useAuth();

  // Permissions
  const ability = defineAbilityFor(auth?.provider === 'guest' ? 'guest' : 'user');

  function updateApp(id: string, updates: Partial<AppSchema>) {
    console.log('CASL> updateApp');
    if (ability.can('modify', 'App')) {
      update(id, updates);
    } else {
      console.log('CASL> You are not authorized to modify this app');
    }
  }
  function updateStateApp(id: string, state: Partial<AppState>) {
    console.log('CASL> updateStateApp');
    if (ability.can('modify', 'App')) {
      updateState(id, state);
    } else {
      console.log('CASL> You are not authorized to updateState this app');
    }
  }
  function createApp(newApp: AppSchema) {
    console.log('CASL> createApp');
    if (ability.can('create', 'App')) {
      create(newApp);
    } else {
      console.log('CASL> You are not authorized to create an app');
    }
  }
  function deleteApp(id: string) {
    console.log('CASL> deleteApp');
    if (ability.can('delete', 'App')) {
      deletion(id);
    } else {
      console.log('CASL> You are not authorized to modify this app');
    }
  }

  return { createApp, updateApp, updateStateApp, deleteApp };
}

// What are the actions: manage is a builtin alias
type AuthAction = 'manage' | 'move' | 'resize' | 'delete' | 'create' | 'modify';
// What are the subjects: all is a builtin alias
type AuthSubject = 'all' | 'App' | 'asset' | 'room' | 'board';
type AppAbility = PureAbility<[AuthAction, AuthSubject]>;

/**
 * Define the ability of a user to perform an action on a resource
 * The ability is based on the user's role and on the resource type
 *
 * @param {string} role
 * @param {(string | undefined)} userId
 * @returns
 */
function defineAbilityFor(role: string) {
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
    can(['delete', 'move', 'resize'], 'App');
    cannot(['modify'], 'App');
  } else if (role === 'viewer') {
    // sit back and watch
    cannot(['create', 'modify', 'delete', 'move', 'resize'], 'all');
  }

  return build();
}
