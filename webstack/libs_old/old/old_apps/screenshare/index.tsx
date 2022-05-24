/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: screenshare
 * created by: Dylan Kobayashi
 */

// Import the React library
import React from 'react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for screenshare application
import { screenshareProps, meta } from './metadata';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdOutlineDevices } from 'react-icons/md';
import create from 'zustand';
// import { useUser } from '@sage3/frontend/services';

export const useStore = create((set: any) => ({
  startScreenShare: {} as { [key: string]: boolean },
  setStartScreenShare: (id: string, startScreenShare: boolean) =>
    set((state: any) => ({ startScreenShare: { ...state.startScreenShare, ...{ [id]: startScreenShare } } })),
  appOwner: {} as { [key: string]: string },
  setAppOwner: (id: string, appOwner: string) => set((state: any) => ({ appOwner: { ...state.appOwner, ...{ [id]: appOwner } } })),
}));

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: screenshareProps) => {
  const title = props.info.createdBy.name;

  // Change the title of the application
  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Screen Sharing</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>{title}</p>
    </>
  );
};

/**
 * Define the items on the titlebar (buttons, ...) on the right side
 * @param props
 */
const Controls = (props: screenshareProps) => {
  // const user = useUser();
  // return <>{user.uid === props.info.createdBy.uid ? 'I am screen sharing' : 'I am not screensharing'} </>;
  return <></>;
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: screenshareProps & MenuBarProps) => {
  const name = props.info.createdBy.name;
  return props.showIcon ? (
    <S3AppIcon icon={MdOutlineDevices} appTitle={props.showInfo ? 'By ' + name : undefined} />
  ) : props.showIcon ? (
    'By ' + name
  ) : null;
};

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./screenshare'));

/**
 * Package the three application elements to export
 */
const screenshare = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default screenshare;
