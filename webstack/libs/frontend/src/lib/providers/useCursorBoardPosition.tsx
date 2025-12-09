/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { throttle } from 'throttle-debounce';
import { useUIStore } from '../stores';

type Point = { x: number; y: number };
type ContextType = {
  cursor: Point;
  boardCursor: Point;
  uiToBoard: (x: number, y: number) => Point;
  getCursor: () => Point;
  getBoardCursor: () => Point;
};

const CursorBoardPositionContext = createContext<ContextType>({
  cursor: { x: 0, y: 0 },
  boardCursor: { x: 0, y: 0 },
  uiToBoard: () => ({ x: 0, y: 0 }),
  getCursor: () => ({ x: 0, y: 0 }),
  getBoardCursor: () => ({ x: 0, y: 0 }),
});

export const useCursorBoardPosition = () => useContext(CursorBoardPositionContext);

export const CursorBoardPositionProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // Only use refs - no state updates = no re-renders
  const cursorRef = useRef<Point>({ x: 0, y: 0 });
  const boardCursorRef = useRef<Point>({ x: 0, y: 0 });

  // Batch UI store subscription
  const { scale, boardPosition } = useUIStore((s) => ({
    scale: s.scale,
    boardPosition: s.boardPosition,
  }));

  // Keep refs for scale & position so throttle handler reads latest
  const scaleRef = useRef(scale);
  const posRef = useRef(boardPosition);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    posRef.current = boardPosition;
  }, [boardPosition]);

  // On-demand getters
  const getCursor = useCallback((): Point => {
    return cursorRef.current;
  }, []);
  const getBoardCursor = useCallback((): Point => {
    return boardCursorRef.current;
  }, []);

  // Throttled mousemove handler - only updates refs, no state
  const handleMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    cursorRef.current = { x, y };
    const sc = scaleRef.current;
    const bp = posRef.current;
    boardCursorRef.current = {
      x: Math.floor(x / sc - bp.x),
      y: Math.floor(y / sc - bp.y),
    };
  }, []);

  const throttledMove = useRef(throttle(0, handleMove)).current;

  useEffect(() => {
    window.addEventListener('mousemove', throttledMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', throttledMove);
    };
  }, [throttledMove]);

  // Coordinate converter
  const uiToBoard = useCallback(
    (x: number, y: number): Point => ({
      x: Math.floor(x / scale - boardPosition.x),
      y: Math.floor(y / scale - boardPosition.y),
    }),
    [scale, boardPosition],
  );

  // Memoize context value - only depends on scale/boardPosition changes now
  const value = useMemo(
    () => ({
      cursor: cursorRef.current,
      boardCursor: boardCursorRef.current,
      uiToBoard,
      getCursor,
      getBoardCursor,
    }),
    [uiToBoard, getCursor, getBoardCursor],
  );

  return <CursorBoardPositionContext.Provider value={value}>{children}</CursorBoardPositionContext.Provider>;
};
