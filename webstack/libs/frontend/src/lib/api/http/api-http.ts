/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { SBDoc } from "@sage3/shared/types";
// import { URLSearchParams } from "url";

type POSTResponse<T> = {
  success: boolean,
  message?: string;
  data?: T[]
}

type GETResponse<T> = {
  success: boolean,
  message?: string;
  data?: T[];
}

type PUTResponse = {
  success: boolean,
  message?: string;
}

type DELResponse = {
  success: boolean;
  message?: string;
}

async function POST<T extends SBDoc>(url: string, body: Partial<T["data"]>): Promise<POSTResponse<T>> {
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

async function GET<T extends SBDoc>(url: string, query?: Partial<T["data"]>): Promise<GETResponse<T>> {
  if (query) url = url + '?' + new URLSearchParams(query as Record<string, string>);
  const response = await fetch('/api' + url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  });
  return await response.json();
}

async function PUT<T extends SBDoc>(url: string, body: Partial<T["data"]>): Promise<PUTResponse> {
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
  DELETE
}