/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */


export async function httpPOST(url: string, body: any): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body }),
  });
  return await response.json();
}

export async function httpGET(url: string, params?: any): Promise<any> {
  let urlParams = '';
  if (params) {
    Object.keys(params).forEach((el, idx) => {
      urlParams += `/${el}/${params[el]}`
    })
  }
  const resposne = await fetch(`${url}${urlParams}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return await resposne.json();
}

export async function httpPUT(url: string, params: any, body: any): Promise<any> {
  let urlParams = '';
  Object.keys(params).forEach((el, idx) => {
    urlParams += `/${el}/${params[el]}`
  })
  const response = await fetch(`${url}${urlParams}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body }),
  })
  return await response.json();
}

export async function httpDELETE(url: string, params: any): Promise<any> {
  let urlParams = '';
  Object.keys(params).forEach((el, idx) => {
    urlParams += `/${el}/${params[el]}`
  })
  const response = await fetch(`${url}${urlParams}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })
  return await response.json();
}