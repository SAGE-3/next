/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// @ts-nocheck

/**
 * SAGE3 application: freehand
 * created by: Luc Renambot <renambot@gmail.com>
 */

// Import the React library
import React, { useState, useRef, useEffect } from 'react';

// perfect-freehand library
import getStroke from 'perfect-freehand';

// Unique ID Generation
import { v4 as getUUID } from 'uuid';

// Window layout component provided by SAGE3
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';

// State management functions from SAGE3
import { useSageStateReducer } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { freehandProps } from './metadata';

// Import state type definition
import { StrokePath, strokesReducer } from './state-reducers';

// User information
import { useUser } from '@sage3/frontend/services';

import { Spinner } from '@chakra-ui/react';
import { StrokePoint } from 'perfect-freehand/dist/types';
import { useStore } from '.';

export const Appsfreehand: React.FC<freehandProps> = (props) => {
  // Shared data: an array of stroke
  const { data: strokes, dispatch, isPending } = useSageStateReducer(props.state.strokes, strokesReducer);
  const user = useUser();

  const penColor = useStore((state: any) => state.color[props.id])
  const setSVG = useStore((state: any) => state.setSVG)

  // Handle on the SVG element
  const svg = useRef<SVGSVGElement>(null);

  // The one being drawn
  const [currentMark, setCurrentMark] = useState<null | StrokePath>(null);

  // Point use to convert into SVG coordinates
  const [point, setPoint] = useState<DOMPoint>();

  // perfect-freehand options
  const pfh_options = {
    // use scaling factor for width of the stroke
    size: props.scaleBy * 6, // 24,
    thinning: 0.5,
    smoothing: 0.44,
    streamline: 0.5,
    last: true,
  };

  // Init: create a point to convert coordinate system
  useEffect(() => {
    if (svg && svg.current) {
      setPoint(svg.current.createSVGPoint());
      setSVG(props.id, svg.current);
    }
  }, []);

  /**
   * Turn the points returned by getStroke into SVG path data.
   * (from perfect-freehand)
   * @param {number[][]} stroke
   * @returns {string}
   */
  function getSvgPathFromStroke(stroke: StrokePoint[]): string {
    if (!stroke.length) return ""
    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
        return acc
      },
      ["M", ...stroke[0], "Q"]
    )
    d.push("Z")
    return d.join(" ")
  }

  function getSVG(p: StrokePath): string {
    // Get the stroke from library
    const stroke = getStroke(p.points, pfh_options);
    // Get the SVG representation
    return getSvgPathFromStroke(stroke);
  }

  // Start of a new stroke
  function handlePointerDown(e: React.PointerEvent) {
    // Update the SVG point
    if (point) {
      point.x = e.clientX;
      point.y = e.clientY;
      // The point translated into SVG coordinates
      if (svg && svg.current) {
        const mtrx = svg.current.getScreenCTM();
        if (mtrx) {
          const cursorpt = point.matrixTransform(mtrx.inverse());
          // Reset the stroke and start with new point
          let newpoint: StrokePoint;
          if (e.nativeEvent.pointerType === 'pen') {
            // reduce precision to 2 digits to limit data bandwitdh
            newpoint = [+cursorpt.x.toFixed(2), +cursorpt.y.toFixed(2), e.pressure];
          } else {
            newpoint = [+cursorpt.x.toFixed(2), +cursorpt.y.toFixed(2)];
          }
          let color = "black"
          if (penColor) color = penColor;
          setCurrentMark({
            id: getUUID(),
            color: color,
            points: [newpoint],
            user: user.id
          });
        }
      }
    }
  }

  // Finish drawing a stroke
  function handlePointerUp(e: React.PointerEvent) {
    // Update SAGE state
    if (currentMark) {
      dispatch({ type: 'create', ...currentMark });
      setCurrentMark(null);
    }
  }

  // During the drawing
  function handlePointerMove(e: React.PointerEvent) {
    // Left click
    if (e.buttons === 1) {
      // Update the SVG point
      if (point && currentMark) {
        point.x = e.clientX;
        point.y = e.clientY;
        if (svg && svg.current) {
          const mtrx = svg.current.getScreenCTM();
          if (mtrx) {
            // The local point translated into SVG coordinates
            const cursorpt = point.matrixTransform(mtrx.inverse());
            let newpoint: StrokePoint;
            if (e.nativeEvent.pointerType === 'pen') {
              // reduce precision to 2 digits to limit data bandwitdh
              newpoint = [+cursorpt.x.toFixed(2), +cursorpt.y.toFixed(2), e.pressure];
            } else {
              newpoint = [+cursorpt.x.toFixed(2), +cursorpt.y.toFixed(2)];
            }
            // Add the point
            setCurrentMark({
              ...currentMark,
              points: [...currentMark.points, newpoint],
            });
          }
        }
      }
    }
  }

  return (
    // Main application layout
    <Collection>
      <DataPane {...props.data.strokes}>
        {isPending ? (
          <Spinner
            thickness="4px"
            emptyColor="whiteAlpha.700"
            color="teal.500"
            size="lg"
            style={{ position: 'absolute', top: 20, right: 20 }}
          />
        ) : null}
        {/* SVG object */}
        <svg
          ref={svg}
          viewBox={'0 0 1200 900'}
          width={'100%'}
          height={'100%'}
          cursor={'crosshair'}
          onPointerUp={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* Background */}
          <rect width="100%" height="100%" fill="lightgray" />

          {/* Array of existing strokes */}
          {strokes?.map((mark, i) => (
            <path key={i} fill={mark.color ?? user.color}
              d={getSVG(mark)}
            />
          ))}

          {/* Current stroke being drawn */}
          {currentMark && (
            <path fill={currentMark.color ?? user.color}
              d={getSVG(currentMark)}
            />
          )}
        </svg>
      </DataPane>

    </Collection>
  );
};

export default Appsfreehand;
