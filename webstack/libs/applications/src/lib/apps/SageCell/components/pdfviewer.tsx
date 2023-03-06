/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useMemo } from 'react';
import { AspectRatio, Box } from '@chakra-ui/react';

import { Buffer } from 'buffer';

interface PdfViewerProps {
  data: string;
}

export const PdfViewer = React.memo(({ data }: PdfViewerProps): JSX.Element => {
  const base64DecodedArray = useMemo(() => {
    const atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    const pdfData: string = atob(data);
    return Uint8Array.from(pdfData, (c) => c.charCodeAt(0));
  }, [data]);

  const url = useMemo(() => URL.createObjectURL(new Blob([base64DecodedArray], { type: 'application/pdf' })), [base64DecodedArray]);

  return (
    <AspectRatio maxW="content" ratio={1}>
      <Box as="iframe" title="application/pdf" src={url} />
    </AspectRatio>
  );
});
