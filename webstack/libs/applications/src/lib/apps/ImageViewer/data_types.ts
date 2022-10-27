import {z} from 'zod';

export interface dimensions{
      xmin: number,
      ymin: number,
      xmax: number,
      ymax: number,
  }

export const bboxType = z.record(
  z.object({
  xmin: z.number().optional(),
  ymin: z.number().optional(),
  xmax: z.number().optional(),
  ymax: z.number().optional(),
}))


// export type bboxType2 = z.infer<typeof bboxType>
