/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { Button, ButtonGroup, Tooltip, Box } from '@chakra-ui/react';

import { AppExport, MenuBarProps } from '@sage3/shared/types';
import { useSageSmartData, useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

import { VideoViewerProps, meta, VideoState } from './metadata';
import { MdMovie, MdFileDownload, MdPlayArrow, MdPause, MdVolumeOff, MdVolumeUp, MdRepeat, MdRepeatOn } from 'react-icons/md';

// data store
import create from 'zustand';

import { S3AppIcon } from '@sage3/frontend/ui';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';
import { downloadFile } from '@sage3/frontend/utils/misc';

// data store
export const useStore = create((set: any) => ({
  play: {} as { [key: string]: boolean },
  setPlay: (id: string, play: boolean) => set((state: any) => ({ play: { ...state.play, ...{ [id]: play } } })),
  mute: {} as { [key: string]: boolean },
  setMute: (id: string, mute: boolean) => set((state: any) => ({ mute: { ...state.mute, ...{ [id]: mute } } })),
  loop: {} as { [key: string]: boolean },
  setLoop: (id: string, loop: boolean) => set((state: any) => ({ loop: { ...state.loop, ...{ [id]: loop } } })),
}));

/**
 * Title
 * @param props
 * @returns
 */
const Title = (props: VideoViewerProps) => {
  // const { data: videoState } = useSageStateAtom<VideoState>(props.state.state);
  // const vt = getVideoTimeObject(videoState);
  // const hh = vt.hh >= 10 ? vt.hh : '0' + vt.hh;
  // const mm = vt.mm >= 10 ? vt.mm : '0' + vt.mm;
  // const ss = vt.ss >= 10 ? vt.ss : '0' + vt.ss;

  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Video Player</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>{props.data.file.meta.filename}</p>
      {/* &nbsp; ({hh + ":" + mm + ":" + ss}) */}
    </>
  );
};

const Controls = (props: VideoViewerProps) => {
  const { data } = useSageSmartData(props.data.file);
  const { data: videoState, setData: set_videoState } = useSageStateAtom<VideoState>(props.state.state);

  // data store
  const setPlay = useStore((state: any) => state.setPlay);
  const mute = useStore((state: any) => state.mute[props.id]);
  const setMute = useStore((state: any) => state.setMute);
  const setLoop = useStore((state: any) => state.setLoop);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        {videoState.paused ? (
          <Tooltip placement="bottom" hasArrow={true} label={'Play'} openDelay={400}>
            <Button onClick={() => setPlay(props.id, true)}>
              <MdPlayArrow />
            </Button>
          </Tooltip>
        ) : (
          <Tooltip placement="bottom" hasArrow={true} label={'Pause'} openDelay={400}>
            <Button onClick={() => setPlay(props.id, false)}>
              <MdPause />
            </Button>
          </Tooltip>
        )}

        {videoState.loop ? (
          <Tooltip placement="bottom" hasArrow={true} label={'Loop'} openDelay={400}>
            <Button onClick={() => setLoop(props.id, false)}>
              <MdRepeatOn />
            </Button>
          </Tooltip>
        ) : (
          <Tooltip placement="bottom" hasArrow={true} label={'No Loop'} openDelay={400}>
            <Button onClick={() => setLoop(props.id, true)}>
              <MdRepeat />
            </Button>
          </Tooltip>
        )}

        {mute ? (
          <Tooltip placement="bottom" hasArrow={true} label={'Mute'} openDelay={400}>
            <Button onClick={() => setMute(props.id, false)}>
              <MdVolumeOff />
            </Button>
          </Tooltip>
        ) : (
          <Tooltip placement="bottom" hasArrow={true} label={'Unmute'} openDelay={400}>
            <Button onClick={() => setMute(props.id, true)}>
              <MdVolumeUp />
            </Button>
          </Tooltip>
        )}
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Download Video'} openDelay={400}>
          <Button
            onClick={() => {
              // Go for download
              downloadFile(data.source, props.data.file.meta.filename);
            }}
          >
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
};

const App = React.lazy(() => import('./video-viewer'));

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: VideoViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.file.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? props.data.file.meta.filename : 'Video Viewer'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? <S3AppIcon icon={MdMovie} appTitle={props.showInfo ? str : undefined} /> : props.showInfo ? str : undefined}
      </Box>
    </Tooltip>
  );
};

const VideoViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default VideoViewer;

// ---------------------------------------------------------------------------
// Temporary video time calculator
// This is not accurate and depends on a number of factors to work

function getVideoTimeObject(videoState: VideoState) {
  let ct = videoState.currentTime;
  const paused = videoState.paused;
  const syncTime = videoState.syncTime;
  let hh = 0,
    mm = 0,
    ss = 0;
  hh = Math.floor(ct / 60 / 60); // Sec to min to hours
  mm = Math.floor((ct / 60) % 60); // Sec to min to remainder of min
  ss = Math.floor(ct % 60); // Sec to remainder of mins
  if (paused) {
    hh = Math.floor(ct / 60 / 60); // Sec to min to hours
    mm = Math.floor((ct / 60) % 60); // Sec to min to remainder of min
    ss = Math.floor(ct % 60); // Sec to remainder of mins
  } else {
    ct += (Date.now() - syncTime) / 1000;
    hh = Math.floor(ct / 60 / 60); // Sec to min to hours
    mm = Math.floor((ct / 60) % 60); // Sec to min to remainder of min
    ss = Math.floor(ct % 60); // Sec to remainder of mins
  }
  return { hh, mm, ss };
}
