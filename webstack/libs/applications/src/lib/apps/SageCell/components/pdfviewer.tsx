/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, memo, useEffect } from 'react';
import { AspectRatio, Box } from '@chakra-ui/react';

interface PdfViewerProps {
  data: string;
}

export const PdfViewer = memo(({ data }: PdfViewerProps): JSX.Element => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    // Function to convert base64 to blob, without dependencies
    const b64toBlob = (base64: string) => fetch(`data:application/pdf;base64,${base64}`).then((res) => res.blob());
    // convert the data we got into a blob that can be displayed in an iframe
    b64toBlob(data).then((blob) => {
      setUrl(URL.createObjectURL(blob));
    });
  }, [data]);

  return (
    <AspectRatio maxW="content" ratio={1}>
      <Box as="iframe" title="application/pdf" src={url} />
    </AspectRatio>
  );
});
