/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: stickies
 * created by: Nurit Kirshenbaum
 */

// Import the React library
import React from 'react';

// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';
import { useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for stickies application
import { stickiesProps, meta, StickyType } from './metadata';
import { Button, ButtonGroup, Tooltip } from '@chakra-ui/react';

// import { useAction } from '@sage3/frontend/services';
import { S3AppIcon, S3SmartFunctions } from '@sage3/frontend/ui';
import { downloadFile } from '@sage3/frontend/utils/misc';

import { MdOutlineStickyNote2, MdFileDownload } from 'react-icons/md';

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: stickiesProps) => {
  // Change the title of the application
  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Note</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>by {props.info.createdBy.name}</p>
    </>
  );
};

/**
 * Define the items on the app ui (buttons, ...)
 * @param props
 */
const Controls = (props: stickiesProps) => {
  const stickyValue = useSageStateAtom<StickyType>(props.state.value);

  const colors = ['#FC8181', '#F6AD55', '#F6E05E', '#68D391', '#4FD1C5', '#63b3ed', '#B794F4'];

  // const { act } = useAction();

  const downloadTxt = () => {
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(stickyValue.data.text);
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    // Make a filename with username and date
    const filename = 'sticky-' + dt + '.txt';
    // Go for download
    downloadFile(txturl, filename);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        {/* Colors */}
        {colors.map((color) => {
          return (
            <Button
              key={color}
              value={color}
              bgColor={color}
              _hover={{ background: color, opacity: 0.7, transform: 'scaleY(1.3)' }}
              _active={{ background: color, opacity: 0.9 }}
              size="xs"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                stickyValue.setData((prevState) => {
                  return { ...prevState, ...{ color: color } };
                })
              }
            ></Button>
          );
        })}
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Download as text'} openDelay={400}>
          <Button onClick={downloadTxt}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Add the menu for smart function */}
      <S3SmartFunctions smartFunctions={props.state.smartFunctions} />
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: stickiesProps & MenuBarProps) => {
  const name = props.info.createdBy.name;
  return props.showIcon ? (
    <S3AppIcon icon={MdOutlineStickyNote2} appTitle={props.showInfo ? 'By ' + name : undefined} />
  ) : props.showInfo ? (
    'By ' + name
  ) : undefined;
};

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./stickies'));

/**
 * Package the three application elements to export
 */
const stickies = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default stickies;
