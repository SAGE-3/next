/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { CollectionDocs } from '../index';

type POSTResponse<T> = {
  success: boolean;
  message: string;
  data?: T[];
};

type GETResponse<T> = {
  success: boolean;
  message: string;
  data?: T[] | undefined;
};

type PUTResponse<T> = {
  success: boolean;
  message: string;
  data?: T[] | undefined;
};

type DELResponse = {
  success: boolean;
  message: string;
  data?: string[] | undefined;
};

async function POST<T extends CollectionDocs>(url: string, body: T['data'] | T['data'][]): Promise<POSTResponse<T>> {
  try {
    const response = await fetch('/api' + url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(Array.isArray(body) ? JSON.stringify({ batch: body }) : { ...body }),
    });

    const data = await response.json();
    if (data.success === false) {
      if (data.authentication === false) {
        // window.location.replace('/#/');
        return { success: false, message: 'authentication failed' };
      }
    }
    return data;
  } catch (error) {
    return { success: false, message: 'error' };
  }
}

async function GET<T extends CollectionDocs>(url: string, body?: string[]): Promise<GETResponse<T>> {
  try {
    const response = await fetch('/api' + url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify({ batch: body }) : undefined,
    });
    const data = await response.json();
    if (data.success === false) {
      if (data.authentication === false) {
        // window.location.replace('/#/');
        return { success: false, message: 'authentication failed' };
      }
    }
    return data;
  } catch (error) {
    return { success: false, message: 'error' };
  }
}

async function QUERY<T extends CollectionDocs>(url: string, query: Partial<T['data']>): Promise<GETResponse<T>> {
  url = url + '?' + new URLSearchParams(query as any);
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
      if (data.authentication === false) {
        // window.location.replace('/#/');
        return { success: false, message: 'authentication failed' };
      }
    }
    return data;
  } catch (error) {
    return { success: false, message: 'error' };
  }
}

async function PUT<T extends CollectionDocs>(
  url: string,
  body: Partial<T['data']> | { id: string; updates: Partial<T['data']> }[],
): Promise<PUTResponse<T>> {
  try {
    const response = await fetch('/api' + url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(Array.isArray(body) ? JSON.stringify({ batch: body }) : { ...body }),
    });
    const data = await response.json();
    if (data.success === false) {
      if (data.authentication === false) {
        // window.location.replace('/#/');
        return { success: false, message: 'authentication failed' };
      }
    }
    return data;
  } catch (error) {
    return { success: false, message: 'error' };
  }
}

async function DELETE(url: string, body?: string[]): Promise<DELResponse> {
  try {
    const response = await fetch('/api' + url, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify({ batch: body }) : undefined,
    });
    const data = await response.json();
    if (data.success === false) {
      if (data.authentication === false) {
        // window.location.replace('/#/');
        return { success: false, message: 'authentication failed' };
      }
    }
    return data;
  } catch (error) {
    return { success: false, message: 'error' };
  }
}

export const APIHttp = {
  POST,
  GET,
  QUERY,
  PUT,
  DELETE,
};
