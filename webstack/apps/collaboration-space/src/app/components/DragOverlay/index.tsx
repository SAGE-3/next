/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { AnimateSharedLayout, motion } from 'framer-motion';
import axios from 'axios';

import { SAGE3State, AppAction, AppState, FileDescription, PanZoomState } from '@sage3/shared/types';
import * as AppMetadata from '@sage3/app-metadata';

import { getDataTypes, findMatchingApps, createDataMapping, getDataTypeList, findMatchingExistingApps } from '@sage3/shared/data-matcher';

import { useAction } from '@sage3/frontend/services';
import { Flex, Text } from '@chakra-ui/react';
import { UploadAppSelectorProps } from '@sage3/frontend/components';
import { useAppPosition } from '../Window/useAppPosition';
import { collectFiles } from './files';
interface DragOverlayProps {
  dragInfo: string[];

  isOpen: boolean;
  close(): void;
  onConfigureDrop(files: UploadAppSelectorProps['files']): void;
  setMousePos: (pos: { x: number; y: number }) => void;

  apps: SAGE3State['apps'];
  zoomState: PanZoomState;
}

const DragOverlayMemo = React.memo(DragOverlay);

export { DragOverlayMemo as DragOverlay };

function DragOverlay(props: DragOverlayProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const boardId = params.boardId as string;
  const { act } = useAction();

  const { zoomState, dragInfo, close } = props;

  useEffect(() => {
    divRef.current?.focus();
  }, []);

  const compatibleApps = useMemo(() => {
    if (!dragInfo.length) {
      return {};
    }

    // const matches = findMatchingApps(dragInfo);
    const existingMatches = findMatchingExistingApps(dragInfo, props.apps);

    //! FIX THE FILTER CONDITION
    return Object.fromEntries(
      existingMatches
        // .filter(({ signature }) => dragInfo.every((type) => signature[type].some(({ max }) => max === Infinity)))
        .map(({ name, signature }) => [name, signature])
    );
  }, [dragInfo, props.apps]);

  const [currentTarget, setCurrentTarget] = useState<null | string>(null);

  const targetDebounceTimer = useRef<number>();

  const onTarget = useCallback((target: string) => {
    if (targetDebounceTimer.current) window.clearTimeout(targetDebounceTimer.current);

    targetDebounceTimer.current = window.setTimeout(() => {
      setCurrentTarget(target);
    }, 100);
  }, []);

  const onClose = useCallback(() => {
    if (targetDebounceTimer.current) window.clearTimeout(targetDebounceTimer.current);

    close();
  }, [close]);

  useEffect(() => {
    return () => {
      window.clearTimeout(targetDebounceTimer.current);
    };
  }, []);

  return (
    <motion.div
      ref={divRef}
      tabIndex={-1}
      initial={{ opacity: 0, pointerEvents: 'none', background: '#0004' }}
      animate={{
        opacity: props.isOpen ? 1 : 0,
        pointerEvents: props.isOpen ? 'all' : 'none',
        background: currentTarget === 'BACKGROUND' ? '#afa4' : '#0004',
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        x: 0,
        y: 0,
      }}
      onBlur={onClose}
      onDragLeaveCapture={(event) => {
        // if it isn't dragging over a child element
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onClose();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (currentTarget !== 'BACKGROUND') {
          onTarget('BACKGROUND');
        }
      }}
      onDrop={(event) => {
        //get mouse position ondrop
        props.setMousePos({ x: event.clientX, y: event.clientY });

        if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
          event.preventDefault();
          event.stopPropagation();

          // Collect all the files dropped into an array
          collectFiles(event.dataTransfer).then((allFiles) => {
            props.onConfigureDrop(Array.from(allFiles));
          });
        } else {
          onDrop(event, boardId, props.apps, act, zoomState, undefined);
        }

        setCurrentTarget(null);
        onClose();
      }}
      onKeyUp={(evt) => {
        if (evt.key === 'Escape') {
          onClose();
          setCurrentTarget(null);
        }
      }}
    >
      <AnimateSharedLayout>
        <motion.div
          initial={false}
          transformTemplate={({ scale, x, y }) => `scale(${scale}) translateX(${x}) translateY(${y})`}
          style={{
            scale: zoomState.motionScale,
            x: zoomState.motionX,
            y: zoomState.motionY,
            originX: 0,
            originY: 0,
          }}
        >
          {props.dragInfo.length &&
            Object.values(props.apps).map((app) => (
              <AppDragTarget
                key={app.id}
                app={app}
                isTargeted={app.id === currentTarget}
                isCompatible={compatibleApps[app.id] !== undefined}
                dragInfo={dragInfo}
                onTarget={() => onTarget(app.id)}
                onDrop={(event) => {
                  if (compatibleApps[app.id]) {
                    onDrop(event, boardId, props.apps, act, zoomState, {
                      appName: app.appName,
                      appId: app.id,
                    });
                  }

                  onClose();
                }}
              />
            ))}
        </motion.div>
        {currentTarget === 'BACKGROUND' ? (
          <Flex
            position="absolute"
            transform="translateX(-50%)"
            left="50%"
            top="10%"
            w="md"
            h="auto"
            alignItems="center"
            justifyContent="stretch"
            textAlign="center"
            p={8}
            fontSize="xl"
            fontWeight="semibold"
            color="gray.800"
            pointerEvents="none"
          >
            <NewAppMessage dragInfo={dragInfo} />
          </Flex>
        ) : null}
      </AnimateSharedLayout>
    </motion.div>
  );
}

function AppDragTarget(props: {
  app: AppState;
  isTargeted: boolean;
  isCompatible: boolean;
  dragInfo: string[];
  onTarget(): void;
  onDrop(event: React.DragEvent<HTMLDivElement>): void;
}): JSX.Element {
  const { app, isTargeted, isCompatible, onTarget } = props;
  const appPosition = useAppPosition(
    // Application position
    props.app.position,
    // Set of constraint in position and size (min/max values)
    // between minWidth/minHeight and canvas dimensions
    {
      x: [0, 8192],
      y: [25, 4608],
      width: [0, 8192],
      height: [0, 4608],
    }
  );
  return (
    <motion.div
      initial={false}
      // animate={{ ...appPosition.motion }}
      style={{
        position: 'absolute',
        ...appPosition.motion,
      }}
      onDragOver={(event) => {
        event.stopPropagation();
        event.preventDefault();

        if (!isTargeted) {
          onTarget();
        }
      }}
      onDrop={(event) => {
        event.stopPropagation();
        props.onDrop(event);
      }}
    >
      <Flex
        w="full"
        h="full"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        bg={isCompatible ? '#afaa' : '#faaa'}
        rounded="lg"
        shadow="inner"
        borderColor={isCompatible ? 'green.100' : 'red.100'}
        borderWidth={4}
        p={8}
        fontSize="xl"
        fontWeight="semibold"
        color="gray.800"
        pointerEvents="none"
      >
        {isTargeted ? (
          isCompatible ? (
            <CompatibleMessage dragInfo={props.dragInfo} appName={app.appName as keyof typeof AppMetadata} />
          ) : (
            <IncompatibleMessage dragInfo={props.dragInfo} appName={app.appName as keyof typeof AppMetadata} />
          )
        ) : null}
      </Flex>
    </motion.div>
  );
}

function MessageBox({ children }: { children: React.ReactNode }) {
  return (
    <motion.div layoutId="drag-message" transition={{ type: 'spring', stiffness: 400, bounce: 0.1, damping: 20 }} style={{ zIndex: 20 }}>
      {children}
    </motion.div>
  );
}

function NewAppMessage(props: { dragInfo: string[] }): JSX.Element {
  return (
    <MessageBox>
      <Text fontWeight="light" p={2} bg="whiteAlpha.800" rounded="md" shadow="base" borderColor="green.400" borderWidth="2px">
        Create new App with <ItemListing dragInfo={props.dragInfo} />
      </Text>
    </MessageBox>
  );
}

function CompatibleMessage(props: { dragInfo: string[]; appName: keyof typeof AppMetadata }): JSX.Element {
  return (
    <MessageBox>
      <Text fontWeight="light" p={2} bg="whiteAlpha.800" rounded="md" shadow="base" borderColor="green.400" borderWidth="2px">
        Add <ItemListing dragInfo={props.dragInfo} /> to {AppMetadata[props.appName].name}
      </Text>
    </MessageBox>
  );
}

function IncompatibleMessage(props: { dragInfo: string[]; appName: keyof typeof AppMetadata }): JSX.Element {
  return (
    <MessageBox>
      <Text fontWeight="light" p={2} bg="whiteAlpha.800" rounded="md" shadow="base" borderColor="red.400" borderWidth="2px">
        Cannot Add <ItemListing dragInfo={props.dragInfo} /> to {AppMetadata[props.appName].name}
      </Text>
    </MessageBox>
  );
}

function ItemListing(props: { dragInfo: string[] }) {
  const counts = dataListToCounts(props.dragInfo);

  const itemCounts = Object.entries(counts);
  const numItems = itemCounts.length;

  return numItems > 1 ? (
    <>
      {itemCounts.slice(0, -1).map(([item, count], i) => (
        <Text as="span" fontWeight="semibold" whiteSpace="nowrap">
          {itemAndCountToString(item, count)}
          {i < numItems - 2 ? ', ' : ' '}
        </Text>
      ))}
      {' and '}
      <Text as="span" fontWeight="semibold" whiteSpace="nowrap">
        {itemAndCountToString(...itemCounts[numItems - 1])}
      </Text>
    </>
  ) : numItems > 0 ? (
    <Text as="span" fontWeight="semibold" whiteSpace="nowrap">
      {itemAndCountToString(...itemCounts[0])}
    </Text>
  ) : null;
}

function dataListToCounts(dragInfo: string[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of dragInfo) {
    if (!counts[item]) {
      counts[item] = 0;
    }

    counts[item]++;
  }

  return counts;
}

function itemAndCountToString(item: string, count: number): string {
  return (count > 1 ? `${count}x ` : '') + item;
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

function onDrop(
  event: React.DragEvent<HTMLDivElement>,
  boardId: string,
  apps: DragOverlayProps['apps'],
  act: ReturnType<typeof useAction>['act'],
  zoomState: PanZoomState,
  appInfo?: { appId: string; appName: string }
) {
  event.preventDefault();
  event.stopPropagation();
  const dataTypeList = getDataTypeList();
  const cursorx = event.clientX / zoomState.motionScale.get() - zoomState.motionX.get();
  const cursory = event.clientY / zoomState.motionScale.get() - zoomState.motionY.get();

  if (event.dataTransfer.types.includes('Files')) {
    const fileArray = Array.from(event.dataTransfer.files);
    const fd = new FormData();

    if (fileArray.length) {
      fd.append('targetX', cursorx.toString());
      fd.append('targetY', cursory.toString());

      // fd.append('targetX', ((zoomState?.motionX.get() ?? 0) + event.clientX / (zoomState?.motionScale.get() ?? 1)).toString());
      // fd.append('targetY', ((zoomState?.motionY.get() ?? 0) + event.clientY / (zoomState?.motionScale.get() ?? 1)).toString());
      fd.append('boardId', boardId);

      if (appInfo) {
        fd.append('appId', appInfo.appId);
        fd.append('appName', appInfo.appName);
      } else {
        const fileNames = fileArray.map((file) => file.name);
        const matches = getMatchingApps(fileNames);
        fd.append('appName', matches[0]?.appName);
      }

      for (const file of fileArray) {
        fd.append('files', file);
      }

      if (fd.get('appName') !== 'undefined') {
        // if no app matched, don't upload
        axios
          .post('/api/boards/upload', fd, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
          .catch((error) => {
            if (!error.response.data.authentication) document.location.href = '/';
          });
      }
    }
  } else if (event.dataTransfer.types.every((type) => dataTypeList[type as keyof typeof dataTypeList])) {
    // const { clientX, clientY } = event;

    if (event.dataTransfer.items.length) {
      Promise.all(
        Array.from(event.dataTransfer.items).map((item) => {
          const type = item.type;
          return new Promise((res) =>
            item.getAsString((data) => res({ type, fromAppId: data.split('~')[0], reference: data.split('~')[1] }))
          );
        })
      ).then((v) => {
        const values = v as Record<'type' | 'fromAppId' | 'reference', string>[];
        const oldAppId = values[0].fromAppId;

        const actions: AppAction[keyof AppAction][] = [];
        const id = appInfo?.appId ?? 'PREVIOUS_ACTION_ID';

        if (!appInfo?.appId) {
          actions.push({
            type: 'create',
            appName: apps[oldAppId].appName,
            id: 'new-app',
            position: {
              //panZoomState.motionX.get() - ((window.innerWidth / panZoomState.motionScale.get()) / 2) + wOffset;
              // x: zoomState.motionX.get() - clientX / zoomState.motionScale.get(),
              // y: zoomState.motionY.get() - clientY / zoomState.motionScale.get(),
              x: cursorx,
              y: cursory,
            },
          });
        }

        for (const { reference, fromAppId } of values) {
          if (fromAppId !== id) {
            actions.push({
              type: 'reparent-data',
              reference,
              fromAppId,
              removeFromOld: true,
              id,
            });
          }
        }

        if (actions.length) {
          act(actions);
        }
      });
    }
  }
}
