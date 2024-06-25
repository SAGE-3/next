// /* eslint-disable @typescript-eslint/no-explicit-any */
// export const createWebWorker = (worker: any) => {
//   const code = worker.toString();
//   const blob = new Blob(["(" + code + ")()"]);
//   return new Worker(URL.createObjectURL(blob));
// };