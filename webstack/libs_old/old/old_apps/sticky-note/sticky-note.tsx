/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';

import { Spinner, Button, Box, Text } from '@chakra-ui/react';

import { useSageSmartData } from '@sage3/frontend/smart-data/hooks';
import { Markdown, Code } from '@sage3/frontend/smart-data/render';

import { DataReference } from '@sage3/shared/types';
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';
import { useAction } from '@sage3/frontend/services';

import './sticky-note.scss';
import { FaEdit } from 'react-icons/fa';

import { StickyNoteProps } from './metadata';

export const AppsStickyNote = (props: StickyNoteProps): JSX.Element => {
  const { canAct, act } = useAction();

  const { text } = props.data;

  // currently "open" cell to edit
  const [editingCell, setEditingCell] = useState<null | string>(null);

  const canEdit = canAct('update-data');

  // the last index which was autofocused
  // const [hasAutoFocused, setHasAutoFocused] = useState(-1);

  // effect to autofocus new notes added
  // useEffect(() => {
  //   if (
  //     hasAutoFocused < text.length - 1 && // this index hasn't been autofocused yet (i.e. new note)
  //     !text[text.length - 1].meta.filename && // it isn't created by a file
  //     !text[text.length - 1].meta.updatedTime // it hasn't been edited before (i.e. only new note)
  //   ) {
  //     setHasAutoFocused(text.length - 1);
  //     setEditingCell(text[text.length - 1].reference);
  //   }
  // }, [hasAutoFocused, text]);

  return !text.length ? (
    <Box
      d="flex"
      flex="1"
      alignItems="center"
      justifyContent="center"
      fontSize="2xl"
      fontWeight="lighter"
      color="gray.600"
      p={4}
      m={4}
      bg="whiteAlpha.400"
      rounded="lg"
      textAlign="center"
    >
      Create a Note using
      <Text fontWeight="semibold" ml={2}>
        + Note
      </Text>
    </Box>
  ) : (
    <Collection sync={editingCell === null}>
      {text.map((data) => (
        <DataPane {...data} key={data.reference}>
          <EditableText
            isEditing={editingCell === data.reference}
            canEdit={canEdit}
            onSave={() => setEditingCell(null)}
            onClickEdit={() => {
              setEditingCell((editing) => (editing === data.reference ? null : data.reference));
            }}
            {...data}
          />
        </DataPane>
      ))}
    </Collection>
  );
};

function EditableText(
  props: {
    isEditing: boolean;
    canEdit: boolean;
    onClickEdit(): void;
    onSave(): void;
  } & DataReference<'code'>
) {
  const { isEditing, onClickEdit, canEdit, onSave, ...data } = props;

  const {
    data: { source },
    isPending,
    setData,
  } = useSageSmartData(data);

  return (
    <>
      <Box px={1}>
        {(canEdit && !isEditing && (
          <Button
            size="sm"
            colorScheme="teal"
            p={2}
            my={1}
            rounded="lg"
            mr={2}
            d="inline-flex"
            alignItems="center"
            justifyContent="center"
            onClick={onClickEdit}
          >
            <FaEdit />
          </Button>
        )) ||
          null}
        {isPending ? <Spinner thickness="2px" emptyColor="gray.200" color="teal.500" size="md" /> : null}
      </Box>
      {isEditing ? (
        <Code
          {...data}
          editable={true}
          onSave={({ reference }, value) => {
            onSave();

            if (value !== source) {
              setData({ source: value });
            }
          }}
        />
      ) : (
        <Markdown {...data} />
      )}
    </>
  );
}

export default AppsStickyNote;
