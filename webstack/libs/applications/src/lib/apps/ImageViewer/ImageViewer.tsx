/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { AppWindow } from '../../components';

import { AppSchema } from '../../schema';
import { AssetType, ExtraImageType } from '@sage3/shared/types';
import { useAssetStore } from '@sage3/frontend';
import { state as AppState } from './index';


// Styling
import './styling.css';

function ImageViewer(props: AppSchema): JSX.Element {
  const s = props.state as AppState;

  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<AssetType>();
  const [url, setUrl] = useState('');

  useEffect(() => {
    const myasset = assets.find((a) => a.file === s.filename);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.filename, assets]);

  useEffect(() => {
    if (file) {
      const extra = file.derived as ExtraImageType;
      if (extra) {
        // find the smallest image for this page (multi-resolution)
        const res = extra.sizes.reduce(function (p, v) {
          return (p.width < v.width ? p : v);
        });
        setUrl(res.url);
      }
    }
  }, [file]);


  return (
    <AppWindow app={props}>
      <img src={url} width="100%" />
    </AppWindow>
  );
}

export default ImageViewer;
