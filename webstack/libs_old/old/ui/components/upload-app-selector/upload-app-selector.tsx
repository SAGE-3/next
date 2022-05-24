/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useEffect, useMemo, useReducer } from 'react';

import {
  Button,
  Heading,
  Text,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
  RadioGroup,
  Radio,
  Progress,
  HStack,
  Select,
  Box,
  ListItem,
  UnorderedList,
} from '@chakra-ui/react';
import { FaArrowRight } from 'react-icons/fa';
import { MdFileUpload } from 'react-icons/md';

import * as AppMetadata from '@sage3/app-metadata';

import { createDataMapping, findMatchingApps, getDataTypes } from '@sage3/shared/data-matcher';
import { DataType, FileDescription } from '@sage3/shared/types';
import { LoadingProgressContext } from '../progress/loading-progress';
import { zeroPad } from '@sage3/frontend/utils/misc';

export type AssetDescription = { readonly name: string; type: string; id: string };
type FileList = Array<File | AssetDescription>;

export type UploadAppSelectorProps = {
  files: FileList;
  onUpload: (uploadInfo: UploadConfiguration[]) => void;
  onCancelUpload: () => void;
};

export type UploadConfiguration = { appName: string; files: FileList };

type AppMatch = {
  appName: string;
  data: Record<string, FileDescription | FileDescription[]>;
};

type FormState = {
  mode: 'single-app' | 'separate-types' | 'upload-only';
  enabledModes: {
    'single-app': boolean;
    'separate-types': boolean;
    'upload-only': boolean;
  };
  singleApp: string;
  typeSelection: {
    [t: string]: {
      mode: 'all' | 'each';
      enabledModes: {
        all: boolean;
        each: boolean;
      };
      app: string;
    };
  };
};

type FormAction =
  | { type: 'reset' }
  | {
      type: 'set-mode';
      mode: FormState['mode'];
    }
  | {
      type: 'set-single-app';
      singleApp: string;
    }
  | {
      type: 'set-type-mode';
      dataType: string;
      mode: FormState['typeSelection'][string]['mode'];
    }
  | {
      type: 'set-type-app';
      dataType: string;
      app: string;
    };

const UploadAppSelectorMemo = React.memo(UploadAppSelector);

export { UploadAppSelectorMemo as UploadAppSelector };

function UploadAppSelector(props: UploadAppSelectorProps): JSX.Element {
  const [trouble, setTrouble] = useState(false);
  const [unsupportedFileNames, setUnsupportedFileNames] = useState<string[]>([]);
  const singleApp = useMemo(() => getMatchingApps(props.files.map((file) => file.name)), [props.files]);

  const matchesPerGroup = useMemo(() => {
    const fileGroups = groupFilesByType(props.files);
    let tmpUnsupportedFileNames: string[] = [];
    setTrouble(false);
    const val = Object.fromEntries(
      Object.entries(fileGroups).map(([datatype, files]) => [
        datatype,
        {
          files,
          all: getMatchingApps(files.map((f) => f.name)),
          each: getMatchingApps([files[0].name]),
        },
      ])
    );
    // Checking if there are any unknown file types
    Object.values(val).forEach((elt) => {
      if (elt.all.length === 0 && elt.each.length === 0) {
        tmpUnsupportedFileNames = tmpUnsupportedFileNames.concat(elt.files.map((f) => f.name));
        setTrouble(true);
      }
    });
    setUnsupportedFileNames(tmpUnsupportedFileNames);
    return val;
  }, [props.files]);

  const [state, dispatch] = useReducer(
    (prevState: FormState, action: FormAction) => {
      if (action.type === 'set-mode') {
        return {
          ...prevState,
          mode: action.mode,
        };
      } else if (action.type === 'set-type-mode') {
        return {
          ...prevState,
          typeSelection: {
            ...prevState.typeSelection,
            [action.dataType]: {
              ...prevState.typeSelection[action.dataType],
              mode: action.mode,
            },
          },
        };
      } else if (action.type === 'set-type-app') {
        return {
          ...prevState,
          typeSelection: {
            ...prevState.typeSelection,
            [action.dataType]: {
              ...prevState.typeSelection[action.dataType],
              app: action.app,
            },
          },
        };
      } else if (action.type === 'set-single-app') {
        return { ...prevState, singleApp: action.singleApp };
      } else if (action.type === 'reset') {
        return initialize(prevState, singleApp, matchesPerGroup);
      }

      return prevState;
    },
    {
      mode: 'separate-types',
      typeSelection: {},
      singleApp: '',
      enabledModes: {
        'single-app': false,
        'separate-types': true,
        'upload-only': true,
      },
    },
    (s) => initialize(s, singleApp, matchesPerGroup)
  );

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [props.files]);

  // const canSingleApp = state.enabledModes['single-app'];
  const canGroupTypes = state.enabledModes['separate-types'];
  const canUpload = props.files.every((file) => file instanceof File);

  return (
    <Modal isOpen={props.files.length > 0} onClose={() => props.onCancelUpload()} size="xl" closeOnOverlayClick={false} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Upload {props.files.length} {props.files.length > 1 ? 'files' : 'file'} to the board
        </ModalHeader>
        <ModalBody>
          {trouble ? (
            <>
              <Text align="left" fontSize="xl" mb={2}>
                {unsupportedFileNames.length > 1 ? 'Files' : 'File'} not recognized:
              </Text>
              <UnorderedList overflowY="auto" maxH="10.5rem">
                {unsupportedFileNames.map((name) => {
                  return <ListItem>- {name}</ListItem>;
                })}
              </UnorderedList>
            </>
          ) : (
            <RadioGroup
              onChange={(mode) => dispatch({ type: 'set-mode', mode: mode as FormState['mode'] })}
              value={state.mode}
              colorScheme="teal"
            >
              <VStack alignItems="flex-start">
                {/* <Radio size="lg" my={2} value="single-app" isDisabled={!canSingleApp}>
                <Text color={!canSingleApp ? 'red.600' : 'inherit'} fontStyle={!canSingleApp ? 'italic' : 'inherit'}>
                  As Single App
                </Text>
              </Radio>
              {canSingleApp ? (
                <Select isDisabled={!canSingleApp} onChange={(event) => dispatch({ type: 'set-single-app', singleApp: event.target.value })}>
                  {singleApp.map((recom) => (
                    <option key={recom.appName} value={recom.appName}>
                      {AppMetadata[recom.appName as keyof typeof AppMetadata].name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Divider my={3} /> */}

                <Radio size="lg" my={2} value="separate-types" isDisabled={!canGroupTypes}>
                  <Text color={!canGroupTypes ? 'red.600' : 'inherit'} fontStyle={!canGroupTypes ? 'italic' : 'inherit'}>
                    Upload files and open on the board
                  </Text>
                </Radio>
                {/* <Collapse in={state.mode === 'separate-types'} animateOpacity={true}>
                <VStack p={2} alignItems="stretch">
                  {Object.keys(matchesPerGroup).map((g, idx) => (
                    <PerGroupControls
                      key={idx}
                      group={g as DataType}
                      state={state.typeSelection[g]}
                      matches={matchesPerGroup[g]}
                      dispatch={dispatch}
                    />
                  ))}
                </VStack>
              </Collapse> */}

                {/* <Divider my={3} /> */}

                <Radio size="lg" my={2} value="upload-only" isDisabled={!canUpload}>
                  <Text color={!canUpload ? 'red.600' : 'inherit'} fontStyle={!canUpload ? 'italic' : 'inherit'}>
                    Upload only
                  </Text>
                </Radio>
              </VStack>
            </RadioGroup>
          )}
          {/* <Divider my={3} /> */}

          {trouble ? null : (
            <LoadingProgressContext.Consumer>
              {({ value }) => (
                <VStack mt="20px" alignItems="flex-start" fontSize="lg">
                  <Text>Progress {value > 0 ? zeroPad(value, 2) + '%' : null}</Text>
                  <Progress value={value} size="lg" width="100%" />
                </VStack>
              )}
            </LoadingProgressContext.Consumer>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="teal"
            mr={3}
            disabled={trouble}
            onClick={() => {
              props.onUpload(outputFormState(state, props.files, matchesPerGroup));
            }}
          >
            <MdFileUpload fontSize={18} style={{ marginRight: 4 }} /> Upload
          </Button>
          <Button onClick={props.onCancelUpload}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function PerGroupControls(props: {
  group: DataType;
  state: FormState['typeSelection'][string];
  matches: {
    files: FileList;
    all: AppMatch[];
    each: AppMatch[];
  };
  dispatch: React.Dispatch<FormAction>;
}) {
  return (
    <Box>
      <Heading size="md" fontWeight="light" mt={2} mb={1}>
        {props.group} ({props.matches.files.length})
      </Heading>
      <HStack>
        <Select
          value={props.state.mode}
          onChange={(event) => props.dispatch({ type: 'set-type-mode', mode: event.target.value as 'all' | 'each', dataType: props.group })}
        >
          <option value="all" disabled={!props.state.enabledModes.all}>
            As a Collection
          </option>
          <option value="each" disabled={!props.state.enabledModes.each}>
            Individual Files
          </option>
        </Select>
        <FaArrowRight fontSize={18} />

        <Select onChange={(event) => props.dispatch({ type: 'set-type-app', app: event.target.value, dataType: props.group })}>
          {props.matches[props.state.mode].map((recom) => (
            <option key={recom.appName} value={recom.appName}>
              {AppMetadata[recom.appName as keyof typeof AppMetadata].name}
            </option>
          ))}
        </Select>
      </HStack>
    </Box>
  );
}

export function getMatchingApps(
  filenames: string | string[]
): { appName: string; data: Record<string, FileDescription | FileDescription[]> }[] {
  const fileArray = (Array.isArray(filenames) ? filenames : [filenames]).map((filename) => ({ filename }));

  const dataTypes = getDataTypes(fileArray);

  const matchingApps = findMatchingApps(dataTypes);

  return matchingApps.map((appSig) => ({
    appName: appSig.name,
    data: createDataMapping(fileArray, dataTypes, appSig),
  }));
}

function groupFilesByType(files: FileList): Record<string, FileList> {
  const groups: Record<string, FileList> = {};

  const dataTypes = getDataTypes((files as { name: string }[]).map(({ name }) => ({ filename: name })));

  for (let index = 0; index < files.length; index++) {
    if (!groups[dataTypes[index]]) {
      groups[dataTypes[index]] = [];
    }

    groups[dataTypes[index]].push(files[index] as FileList[number]);
  }

  return groups;
}

function initialize(
  state: FormState,
  singleAppMatches: AppMatch[],
  groupMatches: { [t: string]: { all: AppMatch[]; each: AppMatch[] } }
): FormState {
  const enabledModes = {
    // 'single-app': singleAppMatches.length > 0,
    'single-app': false,
    'separate-types': Object.values(groupMatches).some((g) => g.all.length || g.each.length),
    'upload-only': true,
  };

  return {
    ...state,
    // mode: singleAppMatches.length
    //   ? 'single-app'
    //   : Object.values(groupMatches).every((g) => g.all.length || g.each.length)
    //     ? 'separate-types'
    //     : 'upload-only',
    mode: 'separate-types',
    singleApp: singleAppMatches[0]?.appName ?? '',
    enabledModes,
    typeSelection: Object.fromEntries(
      Object.entries(groupMatches).map(([group, matches]) => {
        const groupModes = {
          all: matches.all.length > 0,
          each: matches.each.length > 0,
        };

        return [
          group,
          {
            enabledModes: groupModes,
            mode: groupModes.each ? 'each' : 'all',
            app: groupModes.all ? matches.all[0]?.appName : matches.each[0]?.appName,
          },
        ];
      })
    ),
  };
}

function outputFormState(
  state: FormState,
  files: FileList,
  groupMatches: {
    [key: string]: {
      files: FileList;
      all: AppMatch[];
      each: AppMatch[];
    };
  }
) {
  if (state.mode === 'upload-only') {
    return [{ appName: '', files }];
  } else if (state.mode === 'single-app') {
    return [{ appName: state.singleApp, files }];
  } else {
    const allOutput = [];

    for (const group of Object.keys(groupMatches)) {
      if (state.typeSelection[group].mode === 'all') {
        allOutput.push({ appName: state.typeSelection[group].app, files: groupMatches[group].files });
      } else {
        allOutput.push(...groupMatches[group].files.map((file) => ({ appName: state.typeSelection[group].app, files: [file] })));
      }
    }

    return allOutput;
  }
}
