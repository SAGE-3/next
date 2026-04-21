/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Button, Tooltip } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAppStore, useUser, useUIStore, useConfigStore } from '@sage3/frontend';
import { FaFirefoxBrowser, FaClipboard } from 'react-icons/fa';
import { MdVolumeOff, MdVolumeUp } from 'react-icons/md';
import { TbMouse, TbMouseOff } from 'react-icons/tb';

import { VNCAudioWrapper } from '../../components/VNC/VncWrapper';

/* App component for CoBrowser */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const selectedId = useUIStore((state) => state.selectedAppId);
  const isSelected = props._id == selectedId;
  const veoUrl = useConfigStore((state) => state.config.veoServer?.url || '');

  return (
    <AppWindow app={props} hideBackgroundColor={'orange'} hideBordercolor={'orange'} hideBackgroundIcon={FaFirefoxBrowser}>
      <VNCAudioWrapper
        veoUrl={veoUrl}
        container="firefox-audio"
        envs={{}}
        props={props}
        sAudio={s.audio}
        sNonOwnerViewOnly={s.nonOwnerViewOnly}
        sLastImage={s.lastImage}
        sClipboard={s.clipboard}
        sInit={s.init}
        sRefreshSeed={s.refreshSeed}
        isSelected={isSelected}
      />
    </AppWindow>
  );
}

/* App toolbar component for the app CoBrowser */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  return (
    <>
      {/* Share/lock controls — only visible to the app owner */}
      {props._createdBy === user?._id && (
        <Tooltip
          label={s.nonOwnerViewOnly ? 'Only you can control the browser' : 'Everyone can control the browser'}
          openDelay={400}
          hasArrow
          placement="top"
        >
          <Button
            size="xs"
            colorScheme={s.nonOwnerViewOnly ? 'red' : 'teal'}
            onClick={() => {
              updateState(props._id, { nonOwnerViewOnly: !s.nonOwnerViewOnly });
            }}
          >
            {s.nonOwnerViewOnly ? <TbMouseOff /> : <TbMouse />}
          </Button>
        </Tooltip>
      )}

      {/* Paste clipboard contents into the VNC session */}
      <Tooltip label="Click to paste" openDelay={400} hasArrow placement="top">
        <Button
          size="xs"
          ml="1"
          colorScheme="teal"
          onClick={async () => {
            try {
              const clipboardData = await navigator.clipboard.readText();
              if (clipboardData) {
                updateState(props._id, { clipboard: clipboardData });
              }
            } catch {
              // Clipboard read can fail if permission is denied — silently ignore
            }
          }}
        >
          <FaClipboard />
        </Button>
      </Tooltip>

      <Tooltip label="Toggle Audio" openDelay={400} hasArrow placement="top">
        <Button
          size="xs"
          ml="1"
          colorScheme="teal"
          onClick={() => {
            updateState(props._id, { audio: !s.audio });
          }}
        >
          {s.audio ? <MdVolumeUp /> : <MdVolumeOff />}
        </Button>
      </Tooltip>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (_props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
