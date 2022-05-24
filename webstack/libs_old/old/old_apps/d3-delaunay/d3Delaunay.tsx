/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: d3Delaunay
 * created by: Luc Renambot
 * based on: https://observablehq.com/@d3/voronoi-neighbors
 */

// Import the React library
import React, { useEffect, useRef } from 'react';

// Window layout component provided by SAGE3
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';

// State management functions from SAGE3
import { useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { d3DelaunayProps, positionType } from './metadata';

// Random generator with a seed
import { Random } from './random';

// Import the CSS definitions for this application
import './styling.css';

// D3 library
import * as d3 from 'd3';
import { Delaunay } from 'd3-delaunay';

type graphProps = {
  id: string;
  points: Array<Array<number>>;
  width: number;
  height: number;
  changed: boolean;
  pos: positionType;
  move: (arg0: positionType) => void;
};

function Chart(props: graphProps) {
  const { id, points, width, height, changed, pos, move } = props;
  const delaunay = useRef<d3.Delaunay<Delaunay.Point>>();
  const voronoi = useRef<d3.Voronoi<Delaunay.Point>>();
  const canvas = useRef<HTMLCanvasElement>(null);
  // Timer to reduce update data rate
  const timeOut = useRef<number | null>(null);

  function render(i: number) {
    if (canvas.current) {
      const context = canvas.current.getContext('2d');
      if (context && voronoi.current && delaunay.current) {
        context.clearRect(0, 0, width, height);
        if (i >= 0) {
          context.fillStyle = '#0f0';
          context.beginPath();
          voronoi.current.renderCell(i, context);
          context.fill();

          const V = [...voronoi.current.neighbors(i)];
          const D = [...delaunay.current.neighbors(i)];
          const U = D.filter((j) => !V.includes(j));

          context.fillStyle = '#ff0';
          context.beginPath();
          for (const j of U) voronoi.current.renderCell(j, context);
          context.fill();

          context.fillStyle = '#cfc';
          context.beginPath();
          for (const j of V) voronoi.current.renderCell(j, context);
          context.fill();
        }

        context.strokeStyle = '#000';
        context.beginPath();
        voronoi.current.render(context);
        voronoi.current.renderBounds(context);
        context.stroke();
      }
    }
  }

  useEffect(() => {
    if (canvas.current) {
      canvas.current.width = width;
      canvas.current.height = height;

      // Setup the data from the points in props
      delaunay.current = Delaunay.from(points);
      voronoi.current = delaunay.current.voronoi([0.5, 0.5, width - 0.5, height - 0.5]);

      // Find a case where the two neighbor sets are unequal (if any).
      for (let i = 0, n = points.length; i < n; ++i) {
        if ([...voronoi.current.neighbors(i)].length !== [...delaunay.current.neighbors(i)].length) {
          render(i);
          break;
        }
      }

      const context = canvas.current.getContext('2d');
      if (context) {
        canvas.current.onmousemove = (event: MouseEvent) => {
          // Cancel the timer if one running
          if (timeOut.current) {
            window.clearTimeout(timeOut.current);
          }

          // Convert to local coordinates
          const [ptx, pty] = d3.pointer(event, canvas.current);
          // Render locally
          if (delaunay.current) render(delaunay.current.find(ptx, pty));

          // Update the state with callback to the app
          // 100ms
          timeOut.current = window.setTimeout(() => {
            move({ x: ptx, y: pty });
          }, 100);
        };
      }
    }
  }, [changed]);

  // Trigger by the parent component updating the position
  useEffect(() => {
    // When position update (mouse), re-render
    if (delaunay.current) render(delaunay.current.find(pos.x, pos.y));
  }, [pos.x, pos.y]);

  return <canvas ref={canvas} id={id} style={{ width: width, height: height }} />;
}

export const Appsd3Delaunay = (props: d3DelaunayProps): JSX.Element => {
  // Getting basic info about the app
  // console.log('App d3Delaunay information>', props.id, props.position);

  // Get a state value and a matching setter function
  const { data: position, setData: setPosition } = useSageStateAtom<positionType>(props.state.mousePosition);

  // Create the props values for the app
  const w = 500;
  const h = 300;
  // Seeding the random generator
  const random = new Random(42);
  const state = {
    id: 'd3app' + props.id,
    points: Array.from({ length: 200 }, () => [random.nextNumber() * w, random.nextNumber() * h]),
    width: w,
    height: h,
    pos: position,
    changed: false,
    move: onMoveFunc,
  } as graphProps;

  function onMoveFunc(p: positionType) {
    // Update the state for synchronization
    setPosition(p);
  }

  return (
    // Main application layout
    <Collection>
      <DataPane {...props.state.mousePosition}>
        d3Delaunay - D3 version {d3.version} - mouse {Math.round(position.x)} x {Math.round(position.y)}
      </DataPane>
      <DataPane {...props.state.mousePosition}>
        <Chart {...state} />
      </DataPane>
    </Collection>
  );
};

export default Appsd3Delaunay;
