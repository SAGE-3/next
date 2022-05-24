// /**
//  * Copyright (c) SAGE3 Development Team
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  *
//  */

// /**
//  * @file RemoteWallService
//  * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
//  * @version 1.0.0
//  */

// import { EventNames, SAGE3Events } from '@sage3/backend/events';
// import { RemoteWallMessage, UserSchema } from '@sage3/shared/types';
// import * as socketio from 'socket.io';

// export class RemoteWallService {
//   public static users = {} as { [uid: string]: { user: UserSchema, socket: socketio.Socket } };

//   public static initialize(io: socketio.Server): void {
//     console.log('RemoteWallService> initialized');

//     // Handler to monitor user changing settings (name, color, type)
//     SAGE3Events.listen(EventNames.UserService, (data) => {
//       if (data.action == 'update-type') {
//         try {
//           if (data.usertype) {
//             this.users[data.uid].user.userType = data.usertype as 'wall' | 'client';
//           }
//         } catch (e) {
//           console.log('RemoteWallService> error', e);
//         }
//       }
//     });

//     io.on('connect', (socket) => {
//       if (!socket.request.userprofile) return;
//       this.users[socket.request.userprofile.id] = { socket: socket, user: socket.request.userprofile };
//       socket.on('remotewall-message', (data: RemoteWallMessage) => {
//         const wallId = data.wallId;
//         // Check to see if user is exists in list
//         if (Object.keys(this.users).indexOf(wallId) != -1) {
//           // Check to see if user is a 'wall' usertype
//           if (this.users[wallId].user.userType == 'wall') {
//             this.users[wallId].socket.emit('remotewall-newview', { ...data });
//           }
//         }
//       });
//     });
//   }
// }
