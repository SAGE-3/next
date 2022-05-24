// https://www.typescriptlang.org/play?ts=4.1.0-dev.20200921#code/C4TwDgpgBACghsAFgSQLZgDYB4AqAaKAaSggA9gIA7AEwGcoBrCEAewDMocA+KAXgCgoREuSp0otYACcAlpQDmgqAH5OAbUIBdERRr0AShADGLKdSyTZCgnEoguSoapwbtZXeICCUqXBAAZGSYsW3tHIRVhAB8oAAMAEgBvQgBfADok+CQ0TFxXAgBRUiMMAFdqCCwmVg4XLQJq9ihQtU0uLhTY8KEALmi4pNSMxKyUdGw6zQbmJsmOroioPsIlPsoIADcIKQBufn5QSFgERFweXmPs8dxpms4eGMbavYPwaFGANTgyyvxYHTE9FGZ3OShgAL0A0ScjY2yI6SSMLhhkknSUqmI7kBjBmtXCqhRwAh4mBc26kU+31Kv3yUEJDkWvSg6y2UnCa0221W-yxkKenHx6hgmnZzM5u32FRKcCk0DYpUoRmAMhYlCg8ggwBuPNEkNJ7QAFCwAEYAKz6fzAJz6MAAlDaTl8ftqYFwXiZKJIoCbTcYiRdEko2DIpJIAHJwVAQPoAIgAIjIIPIWDG8EoMHBw5Ho1AYwAJOAAL1TSjgGr6AGYAAxpoRgKQsX1K2h9NThRLM7OxwxwBgyYCpqAe6QyY2lYCmFtQABsAA4oClaxEO5Qu7mAMKqyQICCD4eyMcT0N9ACMACYF0uRSlmvQPZJ3VuiRsqdALhrgEazX6CDH642-VoNIY1tPYgA
// Allows us to get he Value at Path On Type
// PathValue<Type, path> with DotNotation
type PathImpl<T, K extends keyof T> =
  K extends string
  ? T[K] extends Record<string, any>
  ? T[K] extends ArrayLike<any>
  ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}`
  : K | `${K}.${PathImpl<T[K], keyof T[K]>}`
  : K
  : never;

type Path<T> = PathImpl<T, keyof T> | keyof T;

export type PathValue<T, P extends Path<T>> =
  P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
  ? Rest extends Path<T[K]>
  ? PathValue<T[K], Rest>
  : never
  : never
  : P extends keyof T
  ? T[P]
  : never;

// Hard to read, lots of Typescript fanciness. 
// It gets all the Properties on an SBJSON and transforms into a list of DONOTATION Properties
// {name: string, age: number, stats: {height: number, weight: number}} ===> 
// ["name", "age", "stats", "stats.height", "stats.weight"]
// https://stackoverflow.com/a/66661477
type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`
export type DotNestedKeys<T> = (T extends Record<string, unknown> ?
  { [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}` }[Exclude<keyof T, symbol>] : ""
) extends infer D ? Extract<D, string> : never;

