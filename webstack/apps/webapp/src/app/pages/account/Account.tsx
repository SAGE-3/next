/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';

import { CreateUserModal, useRouteNav, useUser } from '@sage3/frontend';
import { UserSchema } from '@sage3/shared/types';

/**
 * Account creation page for new users
 * Handles board context preservation and redirects
 */
export function AccountPage() {
  const { user, create } = useUser();
  const { toHome } = useRouteNav();

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
   * Retrieves and validates saved board context from localStorage
   */
  const getSavedBoardContext = () => {
    try {
      const savedContext = localStorage.getItem('sage3_pending_board');
      
      if (savedContext) {
        const context = JSON.parse(savedContext);
        
        // Check if context is not too old (24 hours)
        const isRecent = Date.now() - context.timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecent && context.roomId && context.boardId) {
          return context;
        } else {
          // Remove old context
          localStorage.removeItem('sage3_pending_board');
        }
      }
    } catch (error) {
      console.warn('Error reading saved board context:', error);
      localStorage.removeItem('sage3_pending_board');
    }
    return null;
  };

  /**
   * Handles user account creation and redirects
   */
  useEffect(() => {
    if (user) {
      // Check for saved board context first
      const savedContext = getSavedBoardContext();
      if (savedContext) {
        const redirectUrl = `/#/board/${savedContext.roomId}/${savedContext.boardId}`;
        
        // Clear context after setting redirect
        localStorage.removeItem('sage3_pending_board');
        
        // Navigate to board
        window.location.href = redirectUrl;
        return;
      }

      // Fall back to returnTo URL parameter
      const returnTo = getReturnToUrl();
      if (returnTo) {
        window.location.href = `/#${returnTo}`;
      } else {
        toHome();
      }
    }
  }, [user]);

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
