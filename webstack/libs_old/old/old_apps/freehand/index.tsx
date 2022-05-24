/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: freehand
 * created by: Luc Renambot &lt;renambot@gmail.com&gt;
 */

// Import the React library
import React from 'react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

// Download a file
import { downloadFile } from '@sage3/frontend/utils/misc';

// Import the props definition for freehand application
import { freehandProps, meta } from './metadata';
import { Box, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';

import { S3AppIcon } from '@sage3/frontend/ui';
import { MdOutlineBrush, MdFileDownload, MdDelete, MdUndo } from 'react-icons/md';

import { useSageStateReducer } from '@sage3/frontend/smart-data/hooks';
import { strokesReducer } from './state-reducers';
import { useUser } from '@sage3/frontend/services';
import create from 'zustand';

export const useStore = create((set: any) => ({
  color: {} as { [key: string]: string },
  setColor: (id: string, color: string) => set((state: any) => ({ color: { ...state.color, ...{ [id]: color } } })),

  svg: {} as { [key: string]: SVGSVGElement },
  setSVG: (id: string, svg: SVGSVGElement) => set((state: any) => ({ svg: { ...state.svg, ...{ [id]: svg } } })),
}));

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: freehandProps) => {
  // Get values from the props
  const name = props.__meta__.description;

  // Change the title of the application
  return <p style={{ fontWeight: 'bold', margin: 0 }}>{name}</p>;
};

/**
 * Define the items on the titlebar (buttons, ...) on the right side
 * @param props
 */
const Controls = (props: freehandProps) => {
  const setColor = useStore((state: any) => state.setColor);
  const svg = useStore((state: any) => state.svg[props.id]);

  const { dispatch } = useSageStateReducer(props.state.strokes, strokesReducer);

  const { id, name } = useUser();
  // const { act } = useAction();

  const handleColorClick = (color: string) => {
    setColor(props.id, color);
  };

  const handleUndoClick = () => {
    dispatch({ type: 'undo', user: id });
  };

  const handleClearClick = () => {
    dispatch({ type: 'clear' });
  };

  const handleDownloadClick = () => {
    // Create a deep clone
    const clone = svg.cloneNode(true);
    // Create an offscreen image
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bbox = svg.getBBox();
    // 4K export width
    canvas.width = 3840;
    // Use aspect ratio to calculate height
    canvas.height = canvas.width / (bbox.width / bbox.height);
    clone.setAttribute('width', canvas.width);
    clone.setAttribute('height', canvas.height);
    // Convert the SVG element into a SVG string
    const svgString = new XMLSerializer().serializeToString(clone);
    const svgobject = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgobject);

    // Draw when data loaded
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
      const png = canvas.toDataURL('image/png');
      // Current date
      const dt = dateFormat(new Date(), '-yyyy-MM-dd-HH:mm:ss');
      // Make a filename with username and date
      const filename = 'sketch-' + name + dt + '.png';
      // Trigger a download
      downloadFile(png, filename);
      // Cleanup
      URL.revokeObjectURL(png);
      canvas.remove();
      clone.remove();
    };
    // Trigger the image process
    img.src = url;
  };

  const colors = ['black', 'white', '#FC8181', '#F6AD55', '#F6E05E', '#68D391', '#4FD1C5', '#63b3ed', '#B794F4'];

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Undo your last stroke'} openDelay={400}>
          <Button onClick={() => handleUndoClick()}>
            <MdUndo />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Clear the board'} openDelay={400}>
          <Button onClick={() => handleClearClick()}>
            <MdDelete />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" variant="solid">
        {colors.map((color) => (
          <Button
            p="0.5rem"
            key={color}
            bg={color}
            _hover={{ transform: 'scaleY(1.3)', opacity: 0.7 }}
            size="xs"
            border={color === 'black' ? 'solid white 1px' : 'none'}
            onClick={() => handleColorClick(color)}
          />
        ))}
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Download Image'} openDelay={400}>
          <Button onClick={() => handleDownloadClick()}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: freehandProps & MenuBarProps) => {
  const name = props.info.createdBy.name;

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? 'By ' + name : 'Freehand'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdOutlineBrush} appTitle={props.showInfo ? 'By ' + name : undefined} />
        ) : props.showInfo ? (
          'By ' + name
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./freehand'));

/**
 * Package the three application elements to export
 */
const freehand = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default freehand;
