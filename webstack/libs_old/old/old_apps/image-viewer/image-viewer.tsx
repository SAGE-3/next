/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';

import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';
import { Image } from '@sage3/frontend/smart-data/render';
import { useAction } from '@sage3/frontend/services';
import { useSageSmartData } from '@sage3/frontend/smart-data/hooks';

import { ImageViewerProps } from './metadata';

export const AppsImageViewer = (props: ImageViewerProps): JSX.Element => {
  const images = props.data.image;
  const { act } = useAction();
  // Div around the image to capture events
  const divRef = useRef<HTMLDivElement>(null);

  // Info about the first image: we use the aspect ratio value later
  const image0 = useSageSmartData(images[0]);

  // Event handler
  const handleUserKeyPress = useCallback((evt: KeyboardEvent) => {
    switch (evt.key) {
      case "f": {
        // resize the window to fit the page
        const newheight = props.position.width / image0.data.aspectRatio;
        act({
          type: 'resize',
          position: {
            ...props.position,
            height: newheight,
          },
          id: props.id,
        });
      }
    }
  }, [props.position]);

  // Attach/detach event handler from the div
  useEffect(() => {
    const div = divRef.current;
    if (div) {
      div.addEventListener('keydown', handleUserKeyPress);
      div.addEventListener('mouseleave', () => {
        // remove focus onto div
        div.blur();
      });
      div.addEventListener('mouseenter', () => {
        // Focus on the div for jeyboard events
        div.focus({ preventScroll: true });
      });
    }
    return () => {
      if (div) div.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [divRef, handleUserKeyPress]);

  return !images.length ? (
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
      Add One or More Images by Drag & Drop
    </Box>
  ) : (
    <div ref={divRef} style={{ width: "100%", height: "100%", outline: "none" }} tabIndex={1}>
      <Collection>
        {images.map((data) => (
          <DataPane  {...data} key={data.reference}>
            <Image  {...data} style={{ height: '100%' }} />
          </DataPane>
        ))}
      </Collection >
    </div>
  );
};

export default AppsImageViewer;
