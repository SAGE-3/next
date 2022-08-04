/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Twilio Imports
import { useEffect, useRef } from 'react';
import { RemoteVideoTrack } from 'twilio-video';


type WebcamProps = {
  track: RemoteVideoTrack,
  stream: MediaStream
}

function Webcam(props: WebcamProps) {
  // Video and HTML Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      props.track.attach(videoRef.current);
    }
  }, [props.track.sid])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = props.stream;
      videoRef.current.muted = true;
    }
  }, [props.stream.id])

  return (
    <>
      <video ref={videoRef} className="video-container" width="100%" height="100%"></video>
    </>
  )

}