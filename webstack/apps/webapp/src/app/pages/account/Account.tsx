/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';

import { CreateUserModal, useRouteNav, useUser, useAuth } from '@sage3/frontend';
import { UserSchema } from '@sage3/shared/types';

/**
 * Account creation page for new users
 * Handles board context preservation and redirects
 */
export function AccountPage() {
  const { user, create, loading: userLoading } = useUser();
  const { auth } = useAuth();
  const { toHome, toPath } = useRouteNav();

  /**
   * Gets returnTo URL from query parameters with validation
   */
  const getReturnToUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    
    // Validate returnTo URL to prevent open redirects
    if (returnTo) {
      if (returnTo.startsWith('/') && !returnTo.includes('://')) {
        return returnTo;
      }
    }
    return null;
  };

  /**
   * Retrieves and validates saved board context from localStorage with enhanced logging
   */
  const getSavedBoardContext = () => {
    try {
      const savedContext = localStorage.getItem('sage3_pending_board');
      
      if (savedContext) {
        const context = JSON.parse(savedContext);
        console.log('Account Page: Retrieved board context from localStorage:', context);
        
        // Check if context is not too old (24 hours)
        const isRecent = Date.now() - context.timestamp < 24 * 60 * 60 * 1000;
        const age = Date.now() - context.timestamp;
        
        if (isRecent && context.roomId && context.boardId) {
          console.log(`Account Page: Valid board context found (age: ${Math.round(age / 1000)}s)`);
          return context;
        } else {
          // Remove old context
          console.log(`Account Page: Removing stale board context (age: ${Math.round(age / 1000)}s, isRecent: ${isRecent})`);
          localStorage.removeItem('sage3_pending_board');
        }
      } else {
        console.log('Account Page: No saved board context found');
      }
    } catch (error) {
      console.warn('Account Page: Error reading saved board context:', error);
      localStorage.removeItem('sage3_pending_board');
    }
    return null;
  };

  /**
   * Handles user account creation and redirects - with proper error handling
   */
  useEffect(() => {
    console.log('Account Page: State check:', {
      auth: auth ? { id: auth.id, provider: auth.provider, email: auth.email } : null,
      user: user ? { id: user._id, email: user.data.email } : null,
      userLoading,
      timestamp: new Date().toISOString()
    });

    // Wait for user loading to complete
    if (userLoading) {
      console.log('Account Page: User still loading, waiting...');
      return;
    }

    if (user) {
      console.log('Account Page: User account found, proceeding with redirect');
      
      // Check for saved board context first
      const savedContext = getSavedBoardContext();
      if (savedContext) {
        console.log('Account Page: Found saved board context, redirecting to board:', savedContext);
        
        // Clear context after setting redirect
        console.log('Account Page: Clearing saved board context after successful redirect');
        localStorage.removeItem('sage3_pending_board');
        
        // Navigate to board
        toPath(`/board/${savedContext.roomId}/${savedContext.boardId}`);
        return;
      }

      // Fall back to returnTo URL parameter
      const returnTo = getReturnToUrl();
      if (returnTo) {
        console.log('Account Page: Found returnTo parameter, redirecting to:', returnTo);
        toPath(returnTo);
      } else {
        console.log('Account Page: No returnTo or board context, going to home');
        toHome();
      }
    } else if (auth && !user && !userLoading) {
      // Auth exists but no user and loading is complete - show account creation form
      console.log('Account Page: Authentication present but no user account found, showing creation form');
      // The CreateUserModal will be shown by the return statement below
    } else if (!auth) {
      console.log('Account Page: No authentication found, redirecting to login');
      window.location.href = '/login';
    }
  }, [auth, user, userLoading, toHome, toPath]);

  /**
   * Creates a new user account
   */
  const handleCreateUser = (user: UserSchema) => {
    if (create) {
      create(user);
    }
  };

  return <CreateUserModal createUser={handleCreateUser} />;
}
