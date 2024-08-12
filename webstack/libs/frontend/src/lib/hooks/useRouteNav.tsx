/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useNavigate } from 'react-router';

/**
 * Get a piece of JSON data from the server
 * From react docs
 * @param url the url to send the request to
 * @returns
 */
export function useRouteNav() {
  const navigate = useNavigate();

  function toHome(roomId?: string) {
    if (roomId) {
      navigate(`/home/room/${roomId}`);
    } else {
      navigate('/home');
    }
  }

  function toQuickAccess(quickAccess: 'active' | 'starred' | 'recent') {
    navigate(`/home/${quickAccess}`);
  }

  function toBoard(roomId: string, boardId: string) {
    navigate(`/board/${roomId}/${boardId}`);
  }

  function toLogin() {
    navigate(`/login`);
  }

  function toAdmin() {
    navigate(`/admin`);
  }

  function back() {
    navigate(-1);
  }

  return { toHome, toBoard, toLogin, toAdmin, toQuickAccess, back };
}
