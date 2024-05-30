// import { apiUrls } from '../../config';

/**
 * Get all the kernels
 * @returns An array of all the kernels
 */
async function testPost(): Promise<any> {
  const response = await fetch('/api/articulate/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    console.log('uhoh');
  }
  const data = await response.json();
  console.log(data);
  return data;
}

export const ArticulateAPI = {
  testPost,
};
