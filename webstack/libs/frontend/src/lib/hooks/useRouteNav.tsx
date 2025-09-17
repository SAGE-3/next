/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';

// Global history stack (singleton)
const history: string[] = [];
let currentIndex = -1;

export function useRouteNav() {
  const navigate = useNavigate();

  // State for enabling/disabling back & forward buttons
  const [canGoBack, setCanGoBack] = useState(currentIndex > 0 && history.length > 1);
  const [canGoForward, setCanGoForward] = useState(currentIndex < history.length - 1);

  function updateState() {
    setCanGoBack(currentIndex > 0);
    setCanGoForward(currentIndex < history.length - 1);
  }

  function toHome(roomId?: string) {
    if (roomId) {
      navigate(`/home/room/${roomId}`);
    } else {
      navigate('/home');
    }
    updateState();
  }

  function toQuickAccess(quickAccess: 'active' | 'starred' | 'recent') {
    navigate(`/home/${quickAccess}`);
  }

  function toBoard(roomId: string, boardId: string) {
    const boardPath = `/board/${roomId}/${boardId}`;
    // Check if the currentl url contains the boardId and roomId
    const currentPath = window.location.pathname;
    if (currentPath.includes(boardPath)) {
      return; // Already on the correct board
    }
    navigate(boardPath);

    // If moving forward in history, clear any forward entries
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    // Prevent adding duplicate consecutive entries
    if (history[currentIndex] !== boardPath) {
      history.push(boardPath);
      currentIndex = history.length - 1;
    }

    updateState();
  }

  function back() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      navigate(history[currentIndex]);
      updateState();
    }
  }

  function forward() {
    if (currentIndex < history.length - 1) {
      currentIndex += 1;
      navigate(history[currentIndex]);
      updateState();
    }
  }

  function toLogin() {
    navigate(`/login`);
  }

  function toAdmin() {
    navigate(`/admin`);
  }

  function toCreateUser(returnTo?: string) {
    if (returnTo) {
      navigate(`/createuser?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      navigate(`/createuser`);
    }
  }

  function toPath(path: string) {
    navigate(path);
  }

  return { toHome, toBoard, toLogin, toAdmin, toCreateUser, toPath, toQuickAccess, back, forward, canGoBack, canGoForward };
}
