/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect, useMemo } from 'react';

import { useMotionValue, MotionValue } from 'framer-motion';
import { AppState } from '@sage3/shared/types';

type MotionValueAttr = 'x' | 'y' | 'width' | 'height';
type Constraint = [min: number, max: number];
export type ConstraintSet = Record<MotionValueAttr, Constraint>;

type MotionSetter = (
  constraints: ConstraintSet,
  motion: MotionValue<number>,
  ...otherMotionValues: MotionValue<number>[]
) => (value: number) => void;

export type UnsettableMotionValue<V> = Omit<MotionValue<V>, 'set'>;

export type AppPositionMotion = Record<MotionValueAttr, MotionValue<number>>;
export type AppPositionSetters = Record<MotionValueAttr, ReturnType<MotionSetter>>;

export function useAppPosition(
  position: AppState['position'],
  constraints: ConstraintSet,
): {
  motion: AppPositionMotion;
  set: AppPositionSetters;
  constraints: ConstraintSet
} {
  const { x, y, width, height } = position;

  const leftMotion = useMotionValue(x);
  const topMotion = useMotionValue(y);
  const widthMotion = useMotionValue(width);
  const heightMotion = useMotionValue(height);


  useEffect(() => {
    leftMotion.set(x);
  }, [x, leftMotion]);

  useEffect(() => {
    topMotion.set(y);
  }, [y, topMotion]);

  useEffect(() => {
    widthMotion.set(width);
  }, [width, widthMotion]);

  useEffect(() => {
    heightMotion.set(height);
  }, [height, heightMotion]);

  const setX = useMemo(() => makeXSetter(constraints, leftMotion, widthMotion), [
    leftMotion,
    widthMotion,
    constraints,
  ]);
  const setY = useMemo(() => makeYSetter(constraints, topMotion, heightMotion), [
    topMotion,
    heightMotion,
    constraints,
  ]);
  const setW = useMemo(() => makeWSetter(constraints, widthMotion, leftMotion), [
    widthMotion,
    leftMotion,
    constraints,
  ]);
  const setH = useMemo(() => makeHSetter(constraints, heightMotion, topMotion), [
    topMotion,
    heightMotion,
    constraints,
  ]);

  return {
    motion: {
      x: leftMotion,
      y: topMotion,
      width: widthMotion,
      height: heightMotion,
    },
    set: {
      x: setX,
      y: setY,
      width: setW,
      height: setH,
    },
    constraints
  };
}


const makeXSetter: MotionSetter = (constraints, xMotion, widthMotion) => {
  return (value) => {
    const clampedValue = Math.max(constraints.x[0], Math.min(value, constraints.x[1] - widthMotion.get()));

    xMotion.set(clampedValue);
  };
};

const makeYSetter: MotionSetter = (constraints, yMotion, heightMotion) => {
  return (value) => {
    const clampedValue = Math.max(constraints.y[0], Math.min(value, constraints.y[1] - heightMotion.get()));

    yMotion.set(clampedValue);
  };
};

const makeWSetter: MotionSetter = (constraints, widthMotion, xMotion) => {
  return (value) => {
    const clampedValue = Math.max(constraints.width[0], Math.min(value, constraints.width[1], constraints.x[1] - xMotion.get()));

    widthMotion.set(clampedValue);
  };
};

const makeHSetter: MotionSetter = (constraints, heightMotion, yMotion) => {
  return (value) => {
    const clampedValue = Math.max(constraints.height[0], Math.min(value, constraints.height[1], constraints.y[1] - yMotion.get()));

    heightMotion.set(clampedValue);
  };
};
