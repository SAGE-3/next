/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { AppExport, MenuBarProps } from '@sage3/shared/types';

import { StickyNoteProps, meta } from './metadata';
import { useAction } from '@sage3/frontend/services';
import { FaPlus } from 'react-icons/fa';
import { Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdNote } from 'react-icons/md';

const Title = (props: StickyNoteProps) => {
  const str = Array.isArray(props.data.text) ? `${props.data.text.length} Note(s)` : '1 Note';
  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Notes</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>{str}</p>
    </>
  );

};

const Controls = (props: StickyNoteProps) => {
  const { act } = useAction();

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Tooltip placement="bottom" hasArrow={true} label="Add a New Note" openDelay={400}>
        <Button
          size="xs"
          variant="solid"
          onClick={() =>
            act({
              type: 'create-app-data',
              dataType: 'text',
              field: 'text',
              id: props.id,
              defaultValue: {
                source: '### New Note',
              },
            })
          }
        >
          <FaPlus />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: StickyNoteProps & MenuBarProps) => {
  const name = props.info.createdBy.name;
  return props.showIcon ? (
    <S3AppIcon icon={MdNote} appTitle={props.showInfo ? 'By ' + name : undefined} />
  ) : props.showInfo ? (
    'By ' + name
  ) : undefined;
};

const App = React.lazy(() => import('./sticky-note'));

const StickyNote = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default StickyNote;
