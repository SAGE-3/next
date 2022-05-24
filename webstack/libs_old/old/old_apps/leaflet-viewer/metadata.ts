/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';

export type leafLocation = {
  value: [number, number];
};

export type leafZoom = {
  value: number;
};

export type leafBaseLayer = {
  value: string;
};
export type leafOverlay = {
  value: boolean;
};

export const meta = {
  name: 'Leaflet',
  description: 'Map with Leaflet',
  showInMenu: false,
  initialSize: {
    width: 720,
    height: 405,
  },
  data: {
    layer: '.geojson',
  },
  state: {
    location: { type: 'atom', initialState: { value: [21.297, -157.816] } as leafLocation },
    zoom: { type: 'atom', initialState: { value: 13, userZoom: true } as leafZoom },
    baseLayer: { type: 'atom', initialState: { value: 'OpenStreetMap' } as leafBaseLayer },
    overlay: { type: 'atom', initialState: { value: true } as leafOverlay },
  },
} as const;

export type LeafletViewerProps = AppProps<typeof meta>;
