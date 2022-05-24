/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */


export async function httpPOST<Req, Res>(url: string, body: Req): Promise<Res> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body } as Req),
  });
  return await response.json() as Res;
}

export async function httpGET<Req, Res>(url: string, query: any): Promise<Res> {
  let urlQuery = '';
  Object.keys(query).forEach((el, idx) => {
    urlQuery += (idx === 0) ? '?' : '&';
    urlQuery += `${el}=${query[el]}`
  })
  const resposne = await fetch(`${url}${urlQuery}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return await resposne.json() as Res;
}

export async function httpDELETE<Req, Res>(url: string, body: Req): Promise<Res> {
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body } as Req),
  })
  return await response.json() as Res;
}