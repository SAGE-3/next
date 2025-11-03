/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import React from 'react';

import { Button, ButtonGroup, Tooltip } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';

import { state as AppState } from "./index";
import { App, AppGroup } from "../../schema";
import { AppWindow } from '../../components';
import { PaperApp } from './Paper';

// Styling
import './styling.css';

// Fixed aspect ratio for DocuPAGE apps (8.5x11)
const DOCUPAGE_ASPECT_RATIO = 8.5 / 11;

/* App component for DocuPAGE */

function AppComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  return (
    <AppWindow 
      app={props} 
      disableResize={true}
      lockAspectRatio={DOCUPAGE_ASPECT_RATIO}
    >
      <PaperApp 
        topic={s.topic}
        title={s.title}
        authors={s.authors}
        year={s.year}
        venue={s.venue}
        summary={s.summary}
      />
    </AppWindow>
  )
}

/* App toolbar component for the app DocuPAGE */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
