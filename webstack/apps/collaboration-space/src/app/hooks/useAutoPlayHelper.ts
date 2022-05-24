/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';

export function useAutoPlayHelper(): void {
  useEffect(() => {
    const clickDetector = function () {
      // @ts-expect-error adding global to window
      (window['s3GlobalVar_autoPlayHelper'] as boolean) = true;
      // Remove it, doesn't need more than once
      document.body.removeEventListener('click', clickDetector);
    };
    document.body.addEventListener('click', clickDetector);
  }, []); // With [] should only activate once
}
