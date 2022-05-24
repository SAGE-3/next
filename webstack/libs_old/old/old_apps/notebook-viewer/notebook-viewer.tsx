/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

import { useSageSmartData } from '@sage3/frontend/smart-data/hooks';
import { Image, Markdown, Code } from '@sage3/frontend/smart-data/render';

import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';
import { DataReference } from '@sage3/shared/types';

import './notebook-viewer.scss';
import { NotebookViewerProps } from './metadata';

export const AppsNotebookViewer = (props: NotebookViewerProps): JSX.Element => {
  const {
    data: { cells },
  } = useSageSmartData(props.data.file);

  return (
    <Collection>
      {cells.map((info, i) => (
        <NotebookCell {...info} key={info.reference} />
      ))}
    </Collection>
  );
};

function NotebookCell(props: DataReference<'notebook-cell'>) {
  const {
    data: { source, output },
  } = useSageSmartData(props);

  return (
    (source.meta.language === 'markdown') ?
      <DataPane {...props}>
        <Markdown {...(source as DataReference<'code'>)} />
      </DataPane>
      :
      <>
        <DataPane {...props}>
          <Code {...(source as DataReference<'code'>)} />
        </DataPane>

        {(output && output.type === 'image') &&
          <DataPane {...props}>
            <Image {...(output as DataReference<'image'>)} />
          </DataPane>
        }
      </>
  );
}

export default AppsNotebookViewer;
