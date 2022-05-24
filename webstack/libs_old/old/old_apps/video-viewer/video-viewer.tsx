/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// @ts-nocheck too many errors right now

import React, { CSSProperties, useRef, useEffect, useState } from 'react';

import { useSageSmartData, useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

import { VideoViewerProps, VideoState } from './metadata';
import { useStore } from '.';

export const AppsVideoViewer = (props: VideoViewerProps): JSX.Element => {
  const videoNode = useRef(null);
  const { data: fileData } = useSageSmartData(props.data.file);
  const { data: videoState, setData: set_videoState } = useSageStateAtom<VideoState>(props.state.state);

  const [lastSyncTime, set_lastSyncTime] = useState(-1);

  // State guard variables
  const [seekCurrentTime, set_seekCurrentTime] = useState(-1);

  const PPS_PAUSED = true;

  const [ppsStatus, set_ppsStatus] = useState(PPS_PAUSED); // -1, not set; 0: false; 1: true
  const [ppsVideoTime, set_ppsVideoTime] = useState(-1); // Video current time
  const [eventGuard, set_eventGuard] = useState(true); // just flip value
  const [eventGuardTime, set_eventGuardTime] = useState(-1);
  const [hasRunFirstPageUpdate, set_hasRunFirstPageUpdate] = useState(false);
  const [hasRunFirstUpdate, set_hasRunFirstUpdate] = useState(false);
  const EVENT_GUARD_DELAY_AMOUNT = 200; // ms - Update, it depends on the video which causes delay variation

  // Mute
  const play = useStore((state: any) => state.play[props.id])
  const mute = useStore((state: any) => state.mute[props.id])
  const loop = useStore((state: any) => state.loop[props.id])
  const setMute = useStore((state: any) => state.setMute);
  const setLoop = useStore((state: any) => state.setLoop);

  /**
   * Observes for play from the store
   */
  useEffect(() => {
    if (videoNode.current) {
      if (play) {
        videoNode.current.play();
      } else {
        videoNode.current.pause();
      }
    }
  }, [play]);

  /**
   * Observes for loop from the store
   */
  useEffect(() => {
    if (videoNode.current) {
      videoNode.current.loop = loop;
      set_videoState({ ...videoState, loop });
    }
  }, [loop]);

  /**
   * Observes for mute from the store
   */
  useEffect(() => {
    if (videoNode.current) {
      videoNode.current.muted = mute;
    }
  }, [mute]);

  // ---------------------------------------------------------------------------
  function videoTimeDecimalReducer(videoTime) {
    return Math.floor(videoTime * 100) / 100; // 100 = 2 decimals
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let shouldVideoStatusCheck = true;
    // ---------------------------------------------------------------------------
    // First check if video state has changed from last known sync time (could be self or external)
    // Self generated events should update the lastSyncTime to prevent duplicate action
    if (videoState && videoState.syncTime !== lastSyncTime) {
      // Click check will not be necessary if videos should be muted by default
      // // First check if the page did NOT have click interaction
      // if (!window["s3GlobalVar_autoPlayHelper"]) {
      // 	videoNode.current.muted = true;
      // }

      set_lastSyncTime(videoState.syncTime);

      let ct = videoState.currentTime;
      if (!hasRunFirstPageUpdate) {
        set_hasRunFirstPageUpdate(true);
        // Only advance time if the state is playing
        if (videoState.paused === false) {
          ct += (Date.now() - videoState.syncTime) / 1000;
        }
      }
      videoNode.current.currentTime = ct;

      if (videoNode.current.paused !== videoState.paused) {
        if (videoState.paused) {
          videoNode.current.pause();
        } else {
          videoNode.current.play();
        }
      }
      videoNode.current.loop = videoState.loop;
      setLoop(videoState.loop);

      shouldVideoStatusCheck = false;
      set_hasRunFirstUpdate(false);
    }
    // ---------------------------------------------------------------------------
    if (shouldVideoStatusCheck) {
      let seeked = false;
      const videoStatusChanged = ppsStatus !== videoState.paused;
      // Is it a valid seek, this is harder because why?
      if (!videoStatusChanged && seekCurrentTime !== -1) {
        if (seekCurrentTime !== videoState.currentTime && hasRunFirstUpdate) {
          seeked = true;
        }
      }
      // If changed has occured, set the state and ship it
      if (videoStatusChanged || seeked) {
        const state = { ...videoState };
        state.paused = ppsStatus;
        state.currentTime = ppsVideoTime;
        if (state.currentTime === -1) {
          state.currentTime = seekCurrentTime;
        }
        state.loop = videoNode.current.loop; // TODO consider if this should be less hit or miss
        state.syncTime = Date.now();
        set_lastSyncTime(state.syncTime);
        set_videoState(state);
      }
      set_seekCurrentTime(-1);
      set_ppsVideoTime(-1);
      if (!hasRunFirstUpdate) {
        set_hasRunFirstUpdate(true);
      }
    }

    // ---------------------------------------------------------------------------
    // ---------------------------------------------------------------------------
    // ---------------------------------------------------------------------------
    let vn = videoNode.current;
    // if there is a video node, and it hasn't been initialized, do so
    if (vn && !vn.s3VideoInfo) {
      vn = videoNode.current;
      vn.s3VideoInfo = {};
      vn.s3VideoInfo.htmlVideo = vn;
      vn.s3VideoInfo.influx = {};
      // ---------------------------------------------------------------------------
      vn.s3VideoInfo.checkIfShouldUpdate = function () {
        this.set_seekCurrentTime(this.influx.seekedTime);
        this.set_ppsStatus(this.htmlVideo.paused);
        this.set_ppsVideoTime(this.influx.videoTime);

        this.set_eventGuard(!this.eventGuard);

        this.influx.seekedTime = -1;
        this.influx.videoTime = -1;
        this.influx.checkSet = false; // Allow later check
      };
      // ---------------------------------------------------------------------------

      // Muted by default
      setMute(props.id, true);
      // Efect handler to track mute/unmute
      vn.onvolumechange = function () {
        setMute(props.id, vn.muted);
      };

      vn.onseeked = function () {
        // on seek
        this.s3VideoInfo.influx.seekedTime = this.currentTime; // record video time moved to
        if (!this.s3VideoInfo.influx.checkSet) {
          // Only if a check is not queued
          this.s3VideoInfo.influx.checkSet = true;
          setTimeout(() => {
            this.s3VideoInfo.checkIfShouldUpdate(); // then check later in case it was a series of events
          }, EVENT_GUARD_DELAY_AMOUNT);
        }
      };
      // ---------------------------------------------------------------------------
      vn.onplay = function () {
        // on play
        this.s3VideoInfo.influx.videoTime = this.currentTime; // record video time moved to
        if (!this.s3VideoInfo.influx.checkSet) {
          // Only if a check is not queued
          this.s3VideoInfo.influx.checkSet = true;
          setTimeout(() => {
            this.s3VideoInfo.checkIfShouldUpdate(); // then check later in case it was a series of events
          }, EVENT_GUARD_DELAY_AMOUNT);
        }
      };
      // ---------------------------------------------------------------------------
      vn.onpause = function () {
        // on pause
        this.s3VideoInfo.influx.videoTime = this.currentTime; // record video time moved to
        if (!this.s3VideoInfo.influx.checkSet) {
          // Only if a check is not queued
          this.s3VideoInfo.influx.checkSet = true;
          setTimeout(() => {
            this.s3VideoInfo.checkIfShouldUpdate(); // then check later in case it was a series of events
          }, EVENT_GUARD_DELAY_AMOUNT);
        }
      };
      // ---------------------------------------------------------------------------
    }

    // Transfer references and values
    vn.s3VideoInfo.eventGuard = eventGuard;
    vn.s3VideoInfo.set_eventGuard = (v) => {
      set_eventGuard(v);
    };
    vn.s3VideoInfo.eventGuardTime = eventGuardTime;
    vn.s3VideoInfo.set_eventGuardTime = (v) => {
      set_eventGuardTime(v);
    };
    vn.s3VideoInfo.videoState = videoState;
    vn.s3VideoInfo.set_videoState = (v) => {
      set_videoState(v);
    };
    vn.s3VideoInfo.seekCurrentTime = seekCurrentTime;
    vn.s3VideoInfo.set_seekCurrentTime = (v) => {
      set_seekCurrentTime(v);
    };
    vn.s3VideoInfo.ppsStatus = ppsStatus;
    vn.s3VideoInfo.set_ppsStatus = (v) => {
      set_ppsStatus(v);
    };
    vn.s3VideoInfo.ppsVideoTime = ppsVideoTime;
    vn.s3VideoInfo.set_ppsVideoTime = (v) => {
      set_ppsVideoTime(v);
    };
  }, [videoState, eventGuard]); // Only activate if values in array change

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Other CSS is enforcing aspect ratio on the video node
  //    allowing width and height both to be 100% without causing video to stretch
  const videoContainerStyle: CSSProperties = {
    position: 'absolute',
    height: '100%',
    width: "100%", // other inherited window css enforces centering at 100% width
    overflow: 'hidden',
  };
  const videoStyle: CSSProperties = {
    height: "100%",
    width: "100%",
  };

  // ---------------------------------------------------------------------------
  return (
    <div style={videoContainerStyle}>
      <video ref={videoNode}
        src={fileData.source}
        controls={true}
        muted={true}
        style={videoStyle}>
      </video>
    </div>
  );
};

export default AppsVideoViewer;
