/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: canvas
 * created by: Luc Renambot
 */

// Import the React library
import React, { useEffect, useState, useRef } from 'react';

// Window layout
import { Box } from '@chakra-ui/react';

// State management functions from SAGE3
import { useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { canvasProps, positionType } from './metadata';

// Import the CSS definitions for this application
import './styling.css';

type drawProps = {
  windowWidth: number;
  windowHeight: number;
  pos: positionType;
  move: (pos: positionType) => void;
};

// The 'resolution' or coordinate system of the canvas
const resolutionX = 400 * window.devicePixelRatio;
const resolutionY = 400 * window.devicePixelRatio;

function getCanvasCoords(ctx: CanvasRenderingContext2D, screenX: number, screenY: number) {
  const matrix = ctx.getTransform();
  const imatrix = matrix.invertSelf();
  const x = screenX * imatrix.a + screenY * imatrix.c + imatrix.e;
  const y = screenX * imatrix.b + screenY * imatrix.d + imatrix.f;
  return [x, y];
}

function drawPoint(canvas: HTMLCanvasElement, ptx: number, pty: number) {
  // Get the canvas drawing context
  const context = canvas.getContext('2d');
  if (context) {
    // Convert coordinate
    const [x, y] = getCanvasCoords(context, ptx, pty);
    // Draw a green circle
    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = 'green';
    context.arc(x, y, 5, 0, 2 * Math.PI);
    context.stroke();
  }
}

function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * sx,
    y: (evt.clientY - rect.top) * sy,
  };
}

function draw(canvas: HTMLCanvasElement, scaleX: number, scaleY: number) {
  // Get the canvas drawing context
  const context = canvas.getContext('2d');
  if (context) {
    // Reset size and scale
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.scale(scaleX, scaleY);

    // Draw an image in the center
    const image = new Image();
    image.src = 'https://www.wpclipart.com/blanks/buttons/round/button_round_blue.png';
    // When image is ready, draw it
    image.onload = () => {
      // scaling the image size (depends on the image file)
      const iscale = 2;
      const iw = image.width;
      const ih = image.height;
      // Center
      const px = resolutionX / 2 - iw / (2 * iscale);
      const py = resolutionY / 2 - ih / (2 * iscale);
      // Draw in center with scale
      context.drawImage(image, px, py, iw / iscale, ih / iscale);
    };

    // Draw a blue line from top left to bottom right
    context.beginPath();
    context.moveTo(0, 0);
    context.lineWidth = 2;
    context.strokeStyle = 'blue';
    context.lineTo(resolutionX, resolutionY);
    context.stroke();

    // Draw a red line from bottom left to top right
    context.beginPath();
    context.moveTo(0, resolutionY);
    context.lineWidth = 2;
    context.strokeStyle = 'red';
    context.lineTo(resolutionX, 0);
    context.stroke();
  }
}

function Canvas(props: drawProps) {
  const { windowWidth, windowHeight, pos, move } = props;
  // We need to keep track of the scale to keep drawing in proportion
  const [scale, setScale] = useState({ x: 1, y: 1 });
  // Keep an handle on the DOM canvas element
  const canvas = useRef<HTMLCanvasElement>(null);
  // Timer to reduce update data rate
  const timeOut = useRef<number | null>(null);

  // Calculate scaling factors based on window size
  const calculateScaleX = () => (!canvas.current ? 0 : canvas.current.clientWidth / resolutionX);
  const calculateScaleY = () => (!canvas.current ? 0 : canvas.current.clientHeight / resolutionY);

  // Instead of DOM resize event, here we use size from SAGE
  useEffect(() => {
    if (canvas && canvas.current) {
      // Get the new size from the dom element
      canvas.current.width = canvas.current.clientWidth;
      canvas.current.height = canvas.current.clientHeight;
      const sx = calculateScaleX();
      const sy = calculateScaleY();
      // Calculate the window aspect ratio
      const currentAR = canvas.current.clientWidth / canvas.current.clientHeight;
      // Take with window size into account to correct the aspect ratio
      if (currentAR > 1) {
        setScale({ x: sx / currentAR, y: sy });
      } else {
        setScale({ x: sx, y: sy * currentAR });
      }
    }
  }, [windowWidth, windowHeight]);

  // Draw the scene when scale changes
  useEffect(() => {
    if (canvas && canvas.current) draw(canvas.current, scale.x, scale.y);
  }, [scale.x, scale.y]);

  // Draw the pointer when moved
  useEffect(() => {
    if (canvas && canvas.current) drawPoint(canvas.current, pos.x, pos.y);
  }, [pos.x, pos.y]);

  // First time
  useEffect(() => {
    // Set the mouse handler
    if (canvas && canvas.current) {
      canvas.current.onmousemove = (event: MouseEvent) => {
        // Cancel the timer if one running
        if (timeOut.current) {
          window.clearTimeout(timeOut.current);
        }

        // Convert to local coordinates
        if (canvas && canvas.current) {
          const pt = getMousePos(canvas.current, event);
          drawPoint(canvas.current, pt.x, pt.y);

          // Update the state with callback to the app
          timeOut.current = window.setTimeout(() => {
            move({ x: pt.x, y: pt.y });
          }, 16);
        }
      };
    }
  }, [canvas, move]);

  return <canvas ref={canvas} style={{ width: '100%', height: '100%' }} />;
}

export const AppsCanvas = (props: canvasProps): JSX.Element => {
  // Get a state value and a matching setter function
  const { data: position, setData: setPosition } = useSageStateAtom<positionType>(props.state.mousePosition);

  const state = {
    windowWidth: Math.floor(props.position.width),
    windowHeight: Math.floor(props.position.height),
    pos: position,
    move: onMoveFunc,
  } as drawProps;

  function onMoveFunc(pos: positionType) {
    // Update the state for synchronization
    setPosition(pos);
  }

  return (
    // Main application layout
    <Box
      p={2}
      m={2}
      bg="white"
      color="black"
      shadow="base"
      rounded="md"
      border={2}
      borderColor="gray.100"
      d="flex"
      flex="1"
      alignItems="center"
      justifyContent="center"
      fontSize="xl"
      fontWeight="thin"
      {...props.state.mousePosition}
    >
      <Canvas {...state} />
    </Box>
  );
};

export default AppsCanvas;
