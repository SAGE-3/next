/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

import { useSageAssetUrl, useSageSmartData, useSageStateReducer } from '@sage3/frontend/smart-data/hooks';
import { Image } from '@sage3/frontend/smart-data/render';
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';
import { useAction } from '@sage3/frontend/services';

import { PdfViewerProps } from './metadata';
import { downloadFile } from '@sage3/frontend/utils/misc';

import { pdfReducer } from './state-reducers';

export const PdfViewer = (props: PdfViewerProps): JSX.Element => {
  const {
    data: { pages },
  } = useSageSmartData(props.data.file);
  // Number of pages in the document
  const filepages = pages.length;

  // Info about the first page: we use the aspect ratio value later
  const page0 = useSageSmartData(pages[0]);

  // Get URL of asset
  const {
    data: { url },
  } = useSageAssetUrl(props.data.file);

  const {
    data: { currentPage, numPages },
    dispatch,
  } = useSageStateReducer(props.state.pdfState, pdfReducer);

  // Hack: trigger the rendering of the next page
  if (currentPage === 0 && filepages > 1) {
    axios.get('/api/data/' + pages[1].reference, { withCredentials: true });
  }

  const { act } = useAction();

  // Div around the pages to capture events
  const divRef = useRef<HTMLDivElement>(null);

  // Event handler
  const handleUserKeyPress = useCallback((evt: KeyboardEvent) => {
    switch (evt.key) {
      case "ArrowRight": {
        if (currentPage < (pages.length - 1)) {
          dispatch({ type: 'next-page', length: pages.length });

          // Hack: trigger the rendering of the next page
          if (currentPage < (pages.length - 2)) {
            const nextPage = currentPage + 2;
            axios.get('/api/data/' + pages[nextPage].reference, { withCredentials: true });
          }
        }
        break;
      }
      case "ArrowLeft": {
        dispatch({ type: 'prev-page' });
        break;
      }
      case "1": {
        dispatch({ type: 'to-start' })
        break;
      }
      case "0": {
        dispatch({ type: 'to-end', length: pages.length })
        break;
      }
      case "-": {
        dispatch({ type: 'remove-page' });
        if (numPages > 1) {
          const newwidth = (numPages - 1) * props.position.height * page0.data.aspectRatio;
          act({
            type: 'resize',
            position: {
              ...props.position,
              width: newwidth,
            },
            id: props.id,
          });
        }
        break;
      }
      case "+": {
        if (numPages < filepages) {
          dispatch({ type: 'add-page' });

          const newwidth = (numPages + 1) * props.position.height * page0.data.aspectRatio;
          act({
            type: 'resize',
            position: {
              ...props.position,
              width: newwidth,
            },
            id: props.id,
          });
        }
        break;
      }
      case "D": {
        // Trigger a download
        downloadFile(url, props.data.file.meta.filename);
        break;
      }
      case "f": {
        // resize the window to fit the page
        let newheight;
        if (numPages === 1) {
          newheight = props.position.width / page0.data.aspectRatio;
        } else {
          newheight = (props.position.width / numPages) / page0.data.aspectRatio;
        }
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
  }, [currentPage, numPages, props.position]);


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

  // List of current pages
  const currPages = pages.slice(currentPage, currentPage + numPages);

  useEffect(() => {
    // Initial layout is grid
    // Looks like hack (Luc), should be able to pass type to collection
    act({ type: 'layout', id: props.id, layout: 'grid' });
  }, []);

  return (
    <div ref={divRef} style={{ width: "100%", height: "100%", outline: "none" }} tabIndex={1}>
      <Collection>
        {pages &&
          currPages.map((page) => (
            <DataPane {...page} key={page.reference}>
              <Image {...page} />
            </DataPane>
          ))}
        {!pages && <h1>Error processing PDF</h1>}
      </Collection>
    </div>
  );
};

export default PdfViewer;
