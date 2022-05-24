/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: webview
 * created by: Dylan
 */

import React, { useState } from 'react';
import { AppExport, MenuBarProps } from '@sage3/shared/types';
import { webviewProps, meta } from './metadata';

import { useSageStateAtom, useSageStateReducer } from '@sage3/frontend/smart-data/hooks';
import { Button, ButtonGroup } from '@chakra-ui/button';
import { Tooltip } from '@chakra-ui/tooltip';
import {
  MdArrowBack,
  MdArrowForward,
  MdRefresh,
  MdHome,
  MdAdd,
  MdRemove,
  MdVolumeOff,
  MdOutlineSubdirectoryArrowLeft,
  MdHistory,
  MdWeb,
  MdVolumeUp,
} from 'react-icons/md';
import { Input, InputGroup, Menu, MenuButton, MenuItem, MenuList, Box } from '@chakra-ui/react';
import { addressReducer, visualReducer } from './webviewreducer';
import { isElectron } from './util';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';
import { S3AppIcon } from '@sage3/frontend/ui';
import create from 'zustand';

// Used for the title of the webpage on the Window titlebar
export const useStore = create((set: any) => ({
  title: {} as { [key: string]: string },
  setTitle: (id: string, title: string) => set((state: any) => ({ title: { ...state.title, ...{ [id]: title } } })),

  mute: {} as { [key: string]: boolean },
  setMute: (id: string, mute: boolean) => set((state: any) => ({ mute: { ...state.mute, ...{ [id]: mute } } })),
}));

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: webviewProps) => {
  const title = useStore((state: any) => state.title[props.id]);
  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Webview</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>{title}</p>
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: webviewProps & MenuBarProps) => {
  //Title can be undefined on Load so must check if title exist
  const title = useStore((state: any) => state.title[props.id]);

  return (
    <Tooltip hasArrow={true} label={title ? title : 'Web Browser'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdWeb} appTitle={props.showInfo ? (title ? truncateWithEllipsis(title, 17) : 'Web Browser') : ''} />
        ) : props.showInfo ? (
          title ? (
            truncateWithEllipsis(title, 17)
          ) : (
            'Web Browser'
          )
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

/**
 * Define the items on the titlebar (buttons, ...) on the right side
 * @param props
 */
const Controls = (props: webviewProps) => {
  const mute = useStore((state: any) => state.mute[props.id]);
  const setMute = useStore((state: any) => state.setMute);

  const { data: addressState, dispatch: addressDispatch } = useSageStateReducer(props.state.address, addressReducer);
  const { data: visualState, dispatch: visualDispatch } = useSageStateReducer(props.state.visual, visualReducer);
  const { data: needReload, setData: setReload } = useSageStateAtom<{ reload: boolean }>(props.state.local);

  // const [urlValue, setUrlValue] = useState('');
  // Used to track the url the user types into the address bar
  // Start with the current URL
  const [urlValue, setUrlValue] = useState(addressState.history[addressState.historyIdx]);
  const handleUrlChange = (event: any) => setUrlValue(event.target.value);

  // Used by electron to change the url, usually be in-page navigation.
  const changeUrl = () => {
    let url = urlValue.trim();
    // Check for spaces. If they exist the this isn't a url. Create a google search
    if (url.indexOf(' ') !== -1) {
      url = 'https://www.google.com/search?q=' + url.replace(' ', '+');
    }
    // Maybe it is just a one word search. Check for no SPACES and has no periods.
    // Stuff like: news.google.com will bypass this but a search for 'Chicago' wont
    // But 'Chicago.' will fail....Probably a better way to do this.
    else if (url.indexOf(' ') === -1 && url.indexOf('.') === -1 && url.indexOf('localhost') === -1) {
      url = 'https://www.google.com/search?q=' + url.replace(' ', '+');
    }
    // Must be a URL
    else {
      if (!url.startsWith('http')) {
        // Add https protocol to make it a valid URL
        url = 'https://' + url;
      }
    }
    try {
      url = new URL(url).toString();
      addressDispatch({ type: 'navigate', url });
      // update the address bar
      setUrlValue(url);
    } catch (error) {
      console.log('Webview> Invalid URL');
    }
  };

  return isElectron() ? (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Go Back'} openDelay={400}>
          <Button onClick={() => addressDispatch({ type: 'back' })} disabled={addressState.historyIdx === addressState.history.length - 1}>
            <MdArrowBack />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Go Forward'} openDelay={400}>
          <Button onClick={() => addressDispatch({ type: 'forward' })} disabled={addressState.historyIdx === 0}>
            <MdArrowForward />
          </Button>
        </Tooltip>

        {/* <Tooltip placement="bottom" hasArrow={true} label={'Go to SAGE3 Homepage'} openDelay={400}>
          <Button onClick={() => addressDispatch({ type: 'navigate', url: 'https://sage3.sagecommons.org/' })}>
            <MdHome />
          </Button>
        </Tooltip> */}
        <Tooltip placement="bottom" hasArrow={true} label={'Reload Page'} openDelay={400}>
          <Button onClick={() => setReload({ reload: true })}>
            <MdRefresh />
          </Button>
        </Tooltip>

        <Menu size="xs">
          <Tooltip placement="bottom" hasArrow={true} label={'History'} openDelay={400}>
            <MenuButton as={Button} size="xs" variant="solid">
              <MdHistory />
            </MenuButton>
          </Tooltip>
          <MenuList>
            {addressState.history.map((el, idx) => {
              return addressState.historyIdx === idx ? (
                <MenuItem key={idx} color="teal" onClick={() => addressDispatch({ type: 'navigate-by-history', index: idx })}>
                  {truncateWithEllipsis(el, 40)}
                </MenuItem>
              ) : (
                <MenuItem key={idx} onClick={() => addressDispatch({ type: 'navigate-by-history', index: idx })}>
                  {truncateWithEllipsis(el, 40)}
                </MenuItem>
              );
            })}
          </MenuList>
        </Menu>
      </ButtonGroup>

      <form onSubmit={changeUrl}>
        <InputGroup size="xs" minWidth="200px">
          <Input
            placeholder="Web Address"
            value={urlValue}
            onChange={handleUrlChange}
            onPaste={(event) => {
              event.stopPropagation();
            }}
            backgroundColor="whiteAlpha.300"
          />
        </InputGroup>
      </form>

      <Tooltip placement="bottom" hasArrow={true} label={'Go to Web Address'} openDelay={400}>
        <Button onClick={() => changeUrl()} size="xs" variant="solid">
          <MdOutlineSubdirectoryArrowLeft />
        </Button>
      </Tooltip>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button onClick={() => visualDispatch({ type: 'zoom-in' })}>
            <MdAdd />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button onClick={() => visualDispatch({ type: 'zoom-out' })}>
            <MdRemove />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Mute Webpage'} openDelay={400}>
          <Button onClick={() => setMute(props.id, !mute)}>{mute ? <MdVolumeOff /> : <MdVolumeUp />}</Button>
        </Tooltip>
      </ButtonGroup>
    </>
  ) : null;
};

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./webview'));

/**
 * Package the three application elements to export
 */
const webview = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default webview;
