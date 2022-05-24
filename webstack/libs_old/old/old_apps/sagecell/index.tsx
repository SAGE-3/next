/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: Sagecell
 * created by: Michael Rogers
 */

// Import the React library
import React from 'react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for sagecell application
import { sagecellProps, meta } from './metadata';

import { Button, ButtonGroup, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { MdAdd, MdCode, MdDeleteSweep, MdLockOpen, MdLockOutline, MdNoteAdd, MdPlayArrow } from 'react-icons/md';

import { S3AppIcon } from '@sage3/frontend/ui';
import { useAction, useUser } from '@sage3/frontend/services';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';
import { useSageStateAtom, useSageStateReducer } from '@sage3/frontend/smart-data/hooks';

// Reducer for this app
import { sagecellReducer } from './state-reducer';
import create from 'zustand';

// Used for the title of the webpage on the Window titlebar
export const useStore = create((set: any) => ({
  code: {} as { [key: string]: string },
  setCode: (id: string, code: string) => set((state: any) => ({ code: { ...state.code, ...{ [id]: code } } })),
}));

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: sagecellProps) => {
  // Get values from the props
  const description = props.__meta__.description;
  const name = props.info.createdBy.name;
  // Change the title of the application
  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>{description}</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>by {name}</p>
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: sagecellProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.__meta__.description + ': by ' + props.info.createdBy.name, 17);

  return props.showIcon ? (
    <S3AppIcon icon={MdCode} appTitle={props.showInfo ? 'By ' + str : undefined} />
  ) : props.showInfo ? (
    str
  ) : undefined;
};

/**
 * Define the items on the titlebar (buttons, ...) on the right side
 * @param props
 */
const Controls = (props: sagecellProps) => {
  const { data: sagecell, dispatch } = useSageStateReducer(props.state.sagecell, sagecellReducer);
  const isLocked = useSageStateAtom<{ value: boolean }>(props.state.isLocked);
  const { act } = useAction();
  const user = useUser();
  const lockIconColor = useColorModeValue('pink', 'red');
  const unlockIconColor = useColorModeValue('90EE90', 'green');
  const code = useStore((state: any) => state.code[props.id]);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Run Code'} openDelay={400}>
          <Button px={1} onClick={() => dispatch({ code: code, type: 'run' })}>
            <MdPlayArrow size={'1.5em'} />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {props.info.createdBy.name === user.name ? (
        isLocked.data.value ? (
          <ButtonGroup isAttached size="xs" colorScheme="teal">
            <Tooltip placement="bottom" hasArrow={true} label={'Click to unlock'} openDelay={400}>
              <Button px={1} onClick={() => isLocked.setData({ value: false })}>
                <MdLockOutline size={'1.5em'} color={lockIconColor} />
              </Button>
            </Tooltip>
          </ButtonGroup>
        ) : (
          <ButtonGroup isAttached size="xs" colorScheme="teal">
            <Tooltip placement="bottom" hasArrow={true} label={'Click to lock'} openDelay={400}>
              <Button px={1} onClick={() => isLocked.setData({ value: true })}>
                <MdLockOpen size={'1.5em'} color={unlockIconColor} />
              </Button>
            </Tooltip>
          </ButtonGroup>
        )
      ) : null}

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Start a new Sage Cell below'} openDelay={400}>
          <Button
            px={1}
            onClick={() => {
              act({
                type: 'create',
                appName: 'sagecell',
                id: '',
                position: { x: props.position.x, y: props.position.y + props.position.height + 100, width: props.position.width },
                // optionalData: { sagecell: { code: sagecell.code, output: '', needrun: false } },
                // optionalData: { sagecell: { code: sagecell.code, output: '', needrun: false } },
              });
            }}
          >
            <MdAdd size={'1.5em'} />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Copy code to Sticky Note'} openDelay={400}>
          <Button
            px={1}
            onClick={() => {
              act({
                type: 'create',
                appName: 'stickies',
                id: '',
                position: { x: props.position.x + props.position.width + 20, y: props.position.y, height: props.position.height },
                optionalData: { value: { text: sagecell.code, color: '#F6E05E' } },
              });
            }}
          >
            <MdNoteAdd size={'1.5em'} />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Clear All'} openDelay={400}>
          <Button px={1} onClick={() => dispatch({ type: 'clear' })}>
            <MdDeleteSweep size={'1.5em'} />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
};

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./sagecell'));

/**
 * Package the three application elements to export
 */
const sagecell = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default sagecell;
