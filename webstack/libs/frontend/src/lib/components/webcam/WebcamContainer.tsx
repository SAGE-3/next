/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { usePresenceStore, useTwilioStore } from "../../stores";

type WebcamContainerProps = {
  boardId: string;
}

export function WebcamContainer(props: WebcamContainerProps) {

  // Twilio Store
  const room = useTwilioStore((state) => state.room);
  const tracks = useTwilioStore((state) => state.tracks);

  const presences = usePresenceStore((state) => state.presences);
  const presence = presences.filter(el => el.data.boardId === props.boardId);

  return (
    <div>
      {
        presence.map(el => {
          return <p>{el.data.userId}</p>
        })
      }
    </div>
  )
}