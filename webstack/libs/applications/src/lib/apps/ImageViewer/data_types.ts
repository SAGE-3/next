import { z } from 'zod';

export interface dimensions {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export const bboxType = z.record(
  z.object({
    xmin: z.number(),
    ymin: z.number(),
    xmax: z.number(),
    ymax: z.number(),
  })
);
