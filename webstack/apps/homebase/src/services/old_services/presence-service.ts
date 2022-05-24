// /**
//  * Copyright (c) SAGE3 Development Team
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  *
//  */

// /**
//  * @file Presence Service
//  * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
//  * @version 1.0.0
//  */

// import { EventNames, SAGE3Events } from '@sage3/backend/events';
// import { UserPresence, UserSchema, PresenceTime, PresenceUpdate } from '@sage3/shared/types';

// // Maximum update rate, if new data comes in
// const FPS = 1;

// /**
//  * The Presence sevice keeps track of all the users logged into SAGE3 and where they are located.
//  */
// export class PresenceService {
//   // Store the list of users
//   public static users = {} as { [uid: string]: UserPresence };
//   // True if any new data came in
//   public static gotUpdate: boolean;

//   public static initialize(io: socketio.Server): void {
//     console.log('PresenceService> initialized');
//     this.gotUpdate = false;

//     // Handler to monitor user changing settings (name and color)
//     SAGE3Events.listen(EventNames.UserService, (data) => {
//       console.log('PresenceService> user', data);
//       if (data.action == 'update-color') {
//         try {
//           if (data.color) {
//             this.users[data.uid].color = data.color;
//             this.gotUpdate = true;
//           }
//         } catch (e) {
//           console.log('PresenceService> error ', e);
//         }
//       }
//       if (data.action == 'update-name') {
//         try {
//           if (data.name) {
//             this.users[data.uid].name = data.name;
//             this.gotUpdate = true;
//           }
//         } catch (e) {
//           console.log('PresenceService> error ', e);
//         }
//       }
//       if (data.action == 'update-type') {
//         try {
//           if (data.usertype) {
//             this.users[data.uid].userType = data.usertype as string;
//             this.gotUpdate = true;
//           }
//         } catch (e) {
//           console.log('PresenceService> error ', e);
//         }
//       }
//     });

//     // Time to send update as needed, with max rate
//     setInterval(() => {
//       if (this.gotUpdate) {
//         this.emitStatus(io);
//         this.gotUpdate = false;
//       }
//     }, 1000 / FPS);

//     io.on('connect', (socket) => {
//       if (!socket.request.userprofile) return;

//       const userProfile = socket.request.userprofile as UserSchema;

//       const id = userProfile.id;

//       const userPresence = {
//         id,
//         color: userProfile.color,
//         name: userProfile.name,
//         boardId: '',
//         cursor: [0, 0],
//         view: { x: 0, y: 0, w: 0, h: 0, s: 1 },
//         userType: userProfile.userType,
//         userRole: userProfile.userRole,
//       } as UserPresence;

//       console.log('PresenceService> new user', userPresence.name, userPresence.color);
//       this.users[id] = userPresence;

//       // new connection, emit an update
//       this.gotUpdate = true;

//       socket.on('presence-update', (data: PresenceUpdate) => {
//         if (this.users[id]) {
//           // cursor position update
//           if (data.c) {
//             this.users[id].cursor = data.c;
//             // short immediate broadcast for user's position
//             io.emit('presence-cursor', { uid: id, c: data.c });
//           }
//           if (data.v) {
//             // viewport update
//             this.users[id].view = data.v;
//             // update the clients
//             this.gotUpdate = true;
//           }
//         }
//       });

//       socket.on('presence-time', (data: PresenceTime) => {
//         if (this.users[id] && data.timeZone && data.timeOffset) {
//           this.users[id].timeZone = data.timeZone;
//           this.users[id].timeOffset = data.timeOffset;
//           // update the clients
//           this.gotUpdate = true;
//         }
//       });

//       socket.on('board-connect', ({ boardId }) => {
//         if (this.users[id] && boardId) {
//           this.users[id].boardId = boardId;
//           // update the clients
//           this.gotUpdate = true;
//         }
//       });

//       socket.on('board-disconnect', ({ boardId }) => {
//         if (this.users[id] && boardId) {
//           this.users[id].boardId = '';
//           // update the clients
//           this.gotUpdate = true;
//         }
//       });

//       socket.on('disconnect', () => {
//         if (this.users[id]) {
//           delete this.users[id];
//           // update the clients
//           this.gotUpdate = true;
//         }
//       });
//     });
//   }

//   /**
//    * Emits the status of all the users to the clients.
//    * @param server The Socket IO Object created at server startup in main.ts
//    */
//   private static emitStatus(server: socketio.Server) {
//     // Broadcast users to everyone
//     server.emit('presence-update', Object.values(this.users));
//   }
// }
