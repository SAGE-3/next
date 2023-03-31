/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

type POSTResponse<T> = {
  success: boolean;
  message?: string;
  data?: T[];
};

type GETResponse<T> = {
  success: boolean;
  message?: string;
  data?: T[];
};

type PUTResponse = {
  success: boolean;
  message?: string;
};

type DELResponse = {
  success: boolean;
  message?: string;
};

async function POST<T, K>(url: string, body: T): Promise<POSTResponse<K>> {
  const response = await fetch('/api' + url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body }),
  });
  return await response.json();
}

async function GET<T, K>(url: string, query?: Partial<T>): Promise<GETResponse<K>> {
  if (query) url = url + '?' + new URLSearchParams(query as any);
  try {
    const response = await fetch('/api' + url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (data.success === false) {
      console.log('GET> failed', data);
      if (data.authentication === false) {
        window.location.replace('/#/');
        console.log('GET> auth failed', data);
      }
    }
    return data;
  } catch (error) {
    console.log('GET error', error);
    return { success: false, message: 'error' };
  }
}

async function PUT<T>(url: string, body: Partial<T>): Promise<PUTResponse> {
  const response = await fetch('/api' + url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body }),
  });
  return await response.json();
}

async function DELETE(url: string): Promise<DELResponse> {
  const response = await fetch('/api' + url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

export const APIHttp = {
  POST,
  GET,
  PUT,
  DELETE,
};
