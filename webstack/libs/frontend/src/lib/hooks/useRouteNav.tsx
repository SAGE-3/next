/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import { flushSync } from 'react-dom';
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

  function navigateWithViewTransition(path: string, className?: string) {
    if (typeof document.startViewTransition !== 'function') {
      navigate(path);
      return;
    }

    if (className) document.documentElement.classList.add(className);
    const transition = document.startViewTransition(() => {
      flushSync(() => navigate(path));
    });
    transition.finished.finally(() => {
      if (className) document.documentElement.classList.remove(className);
    });
  }

  function toHome(roomId?: string) {
    const homePath = roomId ? `/home/room/${roomId}` : '/home';
    const isLeavingBoard = window.location.hash.includes('/board/');
    isLeavingBoard ? navigateWithViewTransition(homePath, 'board-transition-back') : navigate(homePath);
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
    navigateWithViewTransition(boardPath);

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
      navigateWithViewTransition(history[currentIndex], 'board-transition-back');
      updateState();
    }
  }

  function forward() {
    if (currentIndex < history.length - 1) {
      currentIndex += 1;
      navigateWithViewTransition(history[currentIndex]);
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
