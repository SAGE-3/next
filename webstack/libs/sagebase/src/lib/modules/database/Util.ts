// Resolve only the requested path, distributing over discriminated/optional unions.
export type PathValue<T, P extends string> = T extends unknown
  ? P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
  : P extends keyof T
  ? T[P]
      : never
  : never;

// Arrays are replaced as values. Dynamic records already cover arbitrary string
// keys; do not expand recursive JSON through them. Bound recursive fixed shapes.
export type DotNestedKeys<T, Depth extends readonly unknown[] = []> = Depth['length'] extends 8
  ? never
  : T extends readonly unknown[]
    ? never
    : T extends object
      ? string extends keyof T
        ? string
        : {
            [K in Extract<keyof T, string | number>]-?: `${K}` | `${K}.${DotNestedKeys<T[K], readonly [...Depth, unknown]>}`;
          }[Extract<keyof T, string | number>]
  : never;
