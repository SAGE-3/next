/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * MapLibre GL JS v6 for the map apps (Map, SensorOverview, HCDP).
 * v6 ships ES modules only: with a bundler (webpack), the worker's URL has to be set once.
 * Import maplibregl from here instead of from 'maplibre-gl'.
 */

import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());

export { maplibregl };
