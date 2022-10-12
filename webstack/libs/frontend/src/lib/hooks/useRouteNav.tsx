/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
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
    navigate(`/home/${roomId}`);
  }

  function toBoard(roomId: string, boardId: string) {
    navigate(`/board/${roomId}/${boardId}`);
  }

  function toLogin() {
    navigate(`/login`);
  }

  return { toHome, toBoard, toLogin };
}
