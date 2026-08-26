/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, memo, useEffect } from 'react';
import { AspectRatio, Box } from '@chakra-ui/react';

import { dataURLtoBlob } from '@sage3/frontend';

interface PdfViewerProps {
  data: string;
}

export const PdfViewer = memo(({ data }: PdfViewerProps): JSX.Element => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    // Decode locally rather than fetch()ing a data: URL, which CSP's
    // connect-src applies to even though nothing leaves the browser
    const blob = dataURLtoBlob(`data:application/pdf;base64,${data}`);
    setUrl(URL.createObjectURL(blob));
  }, [data]);

  return (
    <AspectRatio maxW="content" ratio={1}>
      <Box as="iframe" title="application/pdf" src={url} />
    </AspectRatio>
  );
});
