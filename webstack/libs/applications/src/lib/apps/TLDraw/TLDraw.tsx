/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect } from 'react';
import { ButtonGroup, Button, Tooltip, Box } from '@chakra-ui/react';
// Data store
import { create } from 'zustand';
// TLDraw
import { Tldraw, TLUiComponents, Editor, exportToBlob } from 'tldraw';

import { useYjsStore } from './useYjsStore'

// SAGE3
import { setupApp, useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import { MdUndo, MdRedo, MdSaveAlt, MdZoomInMap } from 'react-icons/md';
import 'tldraw/tldraw.css'

// Zustand store to communicate with toolbar
interface MapStore {
  ed: { [key: string]: Editor };
  saveEditor: (id: string, ed: Editor) => void;
}
const useStore = create<MapStore>()((set) => ({
  ed: {},
  saveEditor: (id: string, ed: Editor) => set((state) => ({ ed: { ...state.ed, ...{ [id]: ed } } })),
}));


/* App component for TLDraw */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const saveEditor = useStore((state) => state.saveEditor);
  const updateState = useAppStore((state) => state.updateState);
  const store = useYjsStore({ roomId: props._id })
  const scale = useUIStore((state) => state.scale);
  const ed: Editor = useStore((state) => state.ed[props._id]);
  const { user } = useUser();

  // Fit the editor to the window when the state is true
  useEffect(() => {
    if (s.fit) {
      if (ed) ed.zoomToFit();
      updateState(props._id, { fit: false });
    }
  }, [s.fit]);

  useEffect(() => {
    if (ed) {
      const myID = ed.user.getId();
      if (s.follow && s.follow !== myID) {
        // ed.updateInstanceState({ followingUserId: s.follow });
        ed.startFollowingUser(s.follow);
      }
    }
  }, [ed, s.follow]);

  // When zoom changes, fit the editor to the window
  // useEffect(() => {
  //   if (ed) ed.zoomToFit();
  // }, [scale]);

  useEffect(() => {
    if (user && ed) {
      ed.user.updateUserPreferences({
        color: user.data.color,
        name: ""
        // name: user.data.name,
      })
    }

  }, [ed, user]);

  // Save the editor instance to the store
  const onMount = (editor: Editor) => {
    if (editor) {
      saveEditor(props._id, editor);
      editor.setCurrentTool('hand');
      editor.zoomToFit();
      editor.updateInstanceState({ isGridMode: true });
      // editor.updateInstanceState({ followingUserId: null });
      editor.stopFollowingUser();
      const myID = editor.user.getId();
      if (props._createdBy === user?._id) {
        updateState(props._id, { follow: myID });
      }
      // editor.on('stop-following', () => {
      //   console.log('Follow> stop');
      // });
    }
  };

  const components: TLUiComponents = {
    // ContextMenu: null,
    // ActionsMenu: null,
    // HelpMenu: null,
    // ZoomMenu: null,
    // MainMenu: null,
    // Minimap: null,
    // StylePanel: null,
    // NavigationPanel: null,
    // Toolbar: null,
    // KeyboardShortcutsDialog: null,
    // QuickActions: null,
    // HelperButtons: null,
    // MenuPanel: null,
    // TopPanel: null,

    SharePanel: null,
    PageMenu: null,
    DebugPanel: null,
    DebugMenu: null,
  };

  return (
    <AppWindow app={props}>
      <Box position="fixed" inset={0} borderRadius={8} overflow="hidden"
        transform={`scale(${1 / scale})`} transformOrigin={'top left'}
        width={props.data.size.width * scale} height={props.data.size.height * scale}>
        <Tldraw components={components} store={store} onMount={onMount} />
      </Box>
    </AppWindow >
  );
}

/* App toolbar component for the app TLDraw */
const ToolbarComponent = (props: App) => {
  const s = props.data.state as AppState;
  const ed: Editor = useStore((state) => state.ed[props._id]);
  const createApp = useAppStore((state) => state.create);
  const updateState = useAppStore((state) => state.updateState);

  const handleUndo = () => {
    ed.undo();
  };
  const handleRedo = () => {
    ed.redo();
  };
  const handleExport = async () => {
    const shapes = ed.getCurrentPageShapes().map((shape) => shape.id);
    const blob = await exportToBlob({ editor: ed, format: "png", ids: shapes, });
    const file = new File([blob], blob.type);
    const b64Data = await blobToBase64(file) as string;
    getImageDimensionsFromBase64(b64Data).then((size) => {
      const xdrop = props.data.position.x + props.data.size.width + 20;
      const ydrop = props.data.position.y;
      createApp(setupApp('TLDraw.png', 'ImageViewer', xdrop, ydrop, props.data.roomId, props.data.boardId,
        { w: size.w, h: size.h }, { assetid: b64Data }));
    });
  };
  const handleFit = () => {
    if (ed) ed.zoomToFit();
    updateState(props._id, { fit: true });
    const myID = ed.user.getId();
    if (s.follow && s.follow !== myID) {
      console.log('Following', s.follow);
      // ed.updateInstanceState({ followingUserId: s.follow });
      ed.startFollowingUser(s.follow);
    }
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
        <Tooltip placement="top-start" hasArrow={true} label={'Undo'} openDelay={400}>
          <Button onClick={() => handleUndo()}>
            <MdUndo />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Redo'} openDelay={400}>
          <Button onClick={() => handleRedo()}>
            <MdRedo />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom to Fit'} openDelay={400}>
          <Button onClick={() => handleFit()}>
            <MdZoomInMap />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
        <Tooltip placement="top-start" hasArrow={true} label={'Export Image to Board'} openDelay={400}>
          <Button onClick={() => handleExport()}>
            <MdSaveAlt />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

/**
 * Convert a blob to a base64 string
 * @param blob
 * @returns
 */
const blobToBase64 = (blob: Blob) => {
  const reader = new FileReader();
  reader.readAsDataURL(blob)
  return new Promise((resolve) => {
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
};

/**
 * Get the dimensions of an image from a base64 string
 *
 * @export
 * @param {string} file
 * @returns {Promise<{w: number, h: number}>}
 */
function getImageDimensionsFromBase64(file: string): Promise<{ w: number; h: number }> {
  return new Promise(function (resolved, _rejected) {
    const i = new Image();
    i.onload = function () {
      resolved({ w: i.width, h: i.height });
    };
    i.src = file;
  });
}
