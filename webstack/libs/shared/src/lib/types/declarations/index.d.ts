/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */


namespace Express {
  interface Request {
    user: import('@sage3/sagebase').SBAuthSchema
    files?: Array<{ originalname: string; mimetype: string; filename: string; size: number }>;
  }
}


// type extension for http request
declare module 'http' {
  interface IncomingMessage {
    user: import('@sage3/sagebase').SBAuthSchema
    session?: any;
    res?: any;
  }
}