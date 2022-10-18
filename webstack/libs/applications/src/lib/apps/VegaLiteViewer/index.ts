/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: VegaLiteViewer
 * created by: RJ
 */

export const schema = z.object({
  spec: z.string(),
  error: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  spec: '{"$schema": "https://vega.github.io/schema/vega-lite/v5.json","description": "A simple bar chart with embedded data.","data": {"values": [{"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},{"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},{"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}]},"mark": "bar","encoding": {"x": {"field": "a", "type": "nominal", "axis": {"labelAngle": 0}},"y": {"field": "b", "type": "quantitative"}}}',
  error: false,
};

export const name = 'VegaLiteViewer';
