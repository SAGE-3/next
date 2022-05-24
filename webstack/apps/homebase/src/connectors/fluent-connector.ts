// /**
//  * Copyright (c) SAGE3 Development Team
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  *
//  */

// /**
//  * Connector for Fluentd logging system.
//  * Fluentd is an open source data collector for unified logging layer
//  * @file Fluentd Connector
//  * @author <a href="mailto:renambot@gmail.com">Luc Renambot</a>
//  * @version 1.0.0
//  */

// // Logging system
// import * as fluentLogger from 'fluent-logger';
// import * as morgan from 'morgan';
// import { Express, Request, Response } from 'express';

// import { config } from '../config';

// // Fix typescript definitions for Fluent
// declare module 'fluent-logger' {
//   interface FluentSender<T> {
//     on(event: string | symbol, listener: (...args: any[]) => void): void;
//   }
// }

// /**
//  * Connects Fluent to the SAGE3 server ecosystem.
//  * @param server The http.Server object for the SAGE3 server. Created in main.ts.
//  * @param app The Express app object. Created in main.ts.
//  */
// //  export function connectFluent(server: Server, app: Express): void {
// export function connectFluent(app: Express): void {
//   // Connect to the logging system (fluentd)
//   console.log('Fluent> Connecting to', config.fluent.host);

//   const logger = fluentLogger.createFluentSender('homebase', {
//     // Use the hostname passed in the config data structure
//     host: config.fluent.host,
//     timeout: 3.0,
//     reconnectInterval: 2000, // 2 sec.
//   });

//   app.use(
//     morgan('tiny', {
//       // Send to fluent logger
//       stream: logger.toStream('http'),
//       // Ignore the log messages
//       skip: function (req: Request, res: Response) {
//         return req.url === '/logs' || res.statusCode === 200 || res.statusCode === 304;
//       },
//     })
//   );

//   logger.on('error', (error: string) => {
//     console.log('Fluent> error ', error);
//   });
//   logger.on('connect', () => {
//     console.log('Fluent>', 'connected!');
//   });
//   // Test messsage
//   logger.emit('server', { record: 'running' });
// }
