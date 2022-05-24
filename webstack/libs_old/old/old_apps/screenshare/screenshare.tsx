/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// // @ts-nocheck

/**
 * SAGE3 application: screenshare
 * created by: Dylan Kobayashi
 */

// Import the React library
import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import { Box, Button, Center, ModalCloseButton, HStack, Radio, RadioGroup, Stack, Tooltip, VStack, useToast } from '@chakra-ui/react';

// State management functions from SAGE3
import { useSageStateAtom } from '@sage3/frontend/smart-data/hooks';
// Needed for user id matching
import { useAction, useUser } from '@sage3/frontend/services';
// To communicate with websockets
import { useSocket } from '@sage3/frontend/utils/misc';

// Import the props definition for this application
import {
  screenshareProps,
  // Mainly for who started the source
  ScreenshareState,
  // Message types
  ScreenshareMessage,
  SsMsgTypes,
} from './metadata';
import { useStore } from '.';
import { S3Modal } from '@sage3/frontend/ui';
import { useDisclosure } from '@chakra-ui/hooks';

/*
General process of webrtc screenshare

  Someone wants to share their screen
    This person is "source"
    All others are "display"

  SS#1. Someone starts screen share app
    SS#1 is not in this file, usually activated by the apps menu in the UI.
    this person is source. others are display
    Action initiated by UI, not in app.
  SS#2. All clients are told to start screenshare app
    app code is the same, need a way to determine who launched
    this determines source and Display
    based off of: props.info.createdBy.id 
  SS#3. If source, user must select what to show
    Currently a screen. Optional for later: window or app
    this is done by showing options within the window.
  SS#4. Upon source selection of what to show
    Attempt to grab through mediaDevices
  SS#5. If not source, clients must send check-in message to identify they want to act as a display
    Upon start, displays wait until they know who the source is
    A late joining display will be told who a source is during startup and doesn't have to wait
  SS#6. Source has a stream
    Update the app state so displays can checking
    This releases displays from SS#5 and allows the start of SS#7 (display initiated)
  SS#7. Establish a webrtc connection between source and displays
    The timing of this can be very different between displays depending on when they connect
    But the general order is as follows
      Source gets a stream and is ready to make connections
      Source looks if displays have already made themselves known
      At a later time displays can make themselves known
      Source create connection by:
        i.		Source create UNIQUE RTCPeerConnection(RTCPC) per display
        ii.		Source creates handles on RTCPC to watch for events
        iii.	Source generates offer
        iv.		Source sends offer to correct display
        v.		Display receives offer from Source
        vi.		Display creates RTCPeerConnection(RTCPC)
        vii.	Display creates handles on RTCPC to watch for events
        viii.	Display uses offer to create answer
        ix.		Display sends answer back to source
        x.		Source receives answer from display and applies it to correct RTCPC
              The answer only works on the RTCPC which generated offer
        xi.		At this point, Source and Display can give each other ice candidates
              Like offer/answer, ice candidates only work with corresponding RTCPC
        * magic * happens and the screenshare shows up.
        Actually at this point the browser handles it.
*/

// ---------------------------------------------------------------------------

const ENABLE_DEBUG_PRINT = false;
// eslint-disable-next-line
function debugprint(...theArgs: any[]) {
  if (ENABLE_DEBUG_PRINT) {
    console.log('Debug > Screenshare > ', ...theArgs);
  }
}

// ---------------------------------------------------------------------------

/**
 * Configuration for making web rtc connections.
 * Contains list of STUN servers to generate ICE candidates.
 * As of 2021 03, just STUN servers, no TURN.
 * STUN servers are used to identify a direct path between clients
 */
export const PEER_CONFIG = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.ippi.fr:3478',
        'stun:stun.ucsb.edu:3478',
        'stun:stun.whoi.edu:3478',
      ],
    },
  ],
};

/**
 * Configuration for source offer options
 */
export const OFFER_OPTIONS = {
  offerToReceiveVideo: 1,
  offerToReceiveAudio: 1,
};

// Socket backup and debug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SS_WS_MSG_DEBUG: any = {};

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
/**
 * App to show screenshare
 *
 * @param props
 */
export const AppsScreenshare = (props: screenshareProps): JSX.Element => {
  // Ref to html video node
  const videoNode = useRef<HTMLVideoElement>(null);
  // Access user information to check who opened app
  const user = useUser();
  // Allows direct WS com with server
  const socket = useSocket();

  const { act } = useAction();

  // ---------------------------------------------------------------------------
  // State tracking variables for SS#5.
  // Refs for state
  const { data: screenShareState, setData: set_screenShareState } = useSageStateAtom<ScreenshareState>(props.state.webviewState);
  // ---------------------------------------------------------------------------
  // State tracking variables for react. Local effect only.

  // Special structure, no setter. Avoid triggering lifecycle updates
  const [allWrtcInfo] = useState({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peerObjects: {} as any, // Use like a dictionary, id is property
    peerList: [] as string[], // list of display client ids
    stream: null as null | MediaStream,
    lastMessageRead: 0,
  }); // NEVER SET IT, this is strictly a reference to ongoing data.

  // -------------------------
  // The following controls UI selection for Source, not used by a Display

  // Whether or not to show selection options. Only Source uses this.
  const [shouldShowMyScreenSharingOptions, set_shouldShowMyScreenSharingOptions] = useState(false);
  // Which of the options Source has currently selected.
  const [screenSelection, set_screenSelection] = useState('1');
  // The selection options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myScreenSharingOptions, set_myScreenSharingOptions] = useState([] as any[]);
  // Set once after screen captured on source. Displays will always see false
  const [sourceHasScreen, set_sourceHasScreen] = useState(false);

  // -------------------------
  // The following tracks if a Display has notified source of existing
  // Source should NEVER touch this
  const [displayToldSourceIsAvailable, set_displayToldSourceIsAvailable] = useState(false);
  const startScreenShare = useStore((state: any) => state.startScreenShare[props.id]);
  const appOwner = useStore((state: any) => state.appOwner[props.id]);
  const setStartScreenShare = useStore((state: any) => state.setStartScreenShare);
  const setAppOwner = useStore((state: any) => state.setAppOwner);

  const { onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    //Create toast for starting new screenshare
    toast({
      id: 'newapp',
      title: 'A screensharing was started by ' + props.info.createdBy.name,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    setStartScreenShare(props.id, false);
    setAppOwner(props.id, user.id);
    return () => {
      // If you leave the room this will close all the peer connections so they can be restarted if you rejoin
      if (!checkIfIsMyShare()) {
        Object.keys(allWrtcInfo.peerObjects).forEach((peerId: string) => {
          if (allWrtcInfo.peerObjects[peerId].rtcpeer) {
            allWrtcInfo.peerObjects[peerId].rtcpeer.close();
            allWrtcInfo.peerObjects[peerId].rtcpeer = null;
            allWrtcInfo.peerObjects[peerId] = {};
          }
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!checkIfIsMyShare()) return;
    set_shouldShowMyScreenSharingOptions(false);

    try {
      const mediaInfo = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSelection,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        },
      } as MediaStreamConstraints;

      navigator.mediaDevices.getUserMedia(mediaInfo).then((value) => {
        // SS#4b, clicking a button will forward the stream
        value.getTracks()[0].applyConstraints({ frameRate: { max: 20, ideal: 15, min: 5 } });
        handleStream(value, startScreenShare);
      });
    } catch (e) {
      console.log('Error > screenshare > stream handling failed', e);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleStream(stream: any, showStream: boolean) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const video: any = videoNode.current;

      if (video) {
        video.srcObject = stream;
        if (showStream) {
          video.onloadedmetadata = () => video.play();
        } else {
          video.pause();
        }
        // SS#4c, only after getting source will the system try to stream
        set_sourceHasScreen(true);
        allWrtcInfo.stream = stream;
      }
    }
    return () => {
      if (startScreenShare && allWrtcInfo.stream) {
        allWrtcInfo.stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [startScreenShare]);

  // ---------------------------------------------------------------------------
  // The person who started the screenshare app should be the Source.
  function checkIfIsMyShare() {
    if (props.info.createdBy.id === getMyId()) {
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // In the future this might change to include browser id component
  // If done, will allow multi login screen share support
  function getMyId() {
    // This function used to do more things.
    // Possibly can reduce all getMyId() calls to user.id
    return user.id;
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // SS#2. After initializing the app, setup useEffect to handle init
  // This useEffect runs once.
  useEffect(() => {
    // Only if this client is Source
    if (checkIfIsMyShare()) {
      // SS#3, is a source: ask use what to show by presenting options
      setupElectronDesktopCapture();
    }

    // Debugging if enabled
    if (ENABLE_DEBUG_PRINT) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)['debugSsWsMessageHolder'] = SS_WS_MSG_DEBUG;
      if (!SS_WS_MSG_DEBUG[props.id]) {
        SS_WS_MSG_DEBUG[props.id] = {
          all: [],
        };
      }
    }

    function newMessage(message: ScreenshareMessage) {
      // If multiple ss apps, then only handle the ones for this app
      if (props.id === message.appId) {
        debugprint('ws message:', message);
        if (ENABLE_DEBUG_PRINT) {
          SS_WS_MSG_DEBUG[props.id].all.push(message);
        }
        determineHowToHandleMessage(message);
      }
    }

    // Setup for BOTH source and display socket handlers
    // This is here because the useEffect will run once.
    socket.on('ssmessage-sendToClient', newMessage);

    return () => {
      socket.off('ssmessage-sendToClient', newMessage);
    };

    // Empty array: run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // S#3 - continued. Source user selects what to share.
  // Assumes electron, will have to be modified later if want to support other browsers
  // Basically, ask electron what is available to share
  function setupElectronDesktopCapture() {
    if (!isElectron()) return; // Stop here if not electron. Default message says use electron

    debugprint('setupElectronDesktopCapture starting');

    // Load electron and the IPCRender
    const electron = window.require('electron');
    const ipcRenderer = electron.ipcRenderer;
    // Get sources from the main process
    ipcRenderer.on('set-source', async (evt: any, sources: any) => {
      // Check all sources and list for screensharing
      const allSources = []; // Make separate object to pass into the state
      for (const source of sources) {
        allSources.push(source);
      } // for each source
      debugprint('allSources', allSources);
      // Store all the sources to display in the UI
      set_myScreenSharingOptions(allSources);
      // Default value is the first source/monitor
      set_screenSelection(allSources[0].id);
      // Show the selection UI
      set_shouldShowMyScreenSharingOptions(true);
    });
    ipcRenderer.send('request-sources');
  }

  // ---------------------------------------------------------------------------
  // SS#4, source source triggers progress through UI selection, see render()

  // ---------------------------------------------------------------------------
  // SS#5, for Displays that are online when app starts, this will usually notify Source after the state updates stating who Source is.
  // Late joining Display will only need this to activate once
  useEffect(() => {
    // ONLY Displays use this, should only activate once
    if (!checkIfIsMyShare() && !displayToldSourceIsAvailable && screenShareState.sourceClientId) {
      set_displayToldSourceIsAvailable(true);
      const message: ScreenshareMessage = {
        appId: props.id,
        from: getMyId(),
        for: SsMsgTypes.SS_SOURCE,
        messageType: SsMsgTypes.NEW_CLIENT,
        content: '', // Content on NEW_CLIENT notification isn't needed
      };
      socket.emit('ssmessage-sendToServer', message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenShareState, displayToldSourceIsAvailable]);

  // ---------------------------------------------------------------------------
  // SS#6, source has a stream, can make wrtc connections
  // 		Update the app state which allows displays to check in (move past SS#5)
  // The following useEffect should activate twice
  //		once after app creation
  //		second after source has source
  // For display clients this functionw ill not do anything
  useEffect(() => {
    // First activation won't have a source, displays evaluate false
    if (!sourceHasScreen) {
      return;
    }
    // On second activation source sets the app state identifying this client's id
    // This causes displays to progress from SS#5

    // ONLY a source will get this far
    set_screenShareState({ sourceClientId: getMyId() });
  }, [sourceHasScreen]); // eslint-disable-line

  // ---------------------------------------------------------------------------
  // NOTE: this is a major factor regarding correct effects.
  // This function currently sees "all" packets (regardless of source /display)
  // Which is why it has to determine if the message is for "this" client
  // And if it is for "this" client, is "this" client a Source or Display?
  function determineHowToHandleMessage(message: ScreenshareMessage): void {
    sourceMessageHandleOrSkip(message);
    displayMessageHandleOrSkip(message);
  }
  // ---------------------------------------------------------------------------
  function sourceMessageHandleOrSkip(message: ScreenshareMessage): void {
    if (message && checkIfIsMyShare()) {
      // If this is a source client
      if (
        message.for === SsMsgTypes.SS_SOURCE || // And the message is for source
        message.for === getMyId()
      ) {
        debugprint('HANDLE MESSAGE FOR SOURCE', message);

        if (message.messageType === SsMsgTypes.NEW_CLIENT) {
          // Reset the peer object (reconnect needs new data)
          if (Object.keys(allWrtcInfo.peerObjects).indexOf(message.from) != -1) {
            allWrtcInfo.peerObjects[message.from].rtcpeer.close();
            allWrtcInfo.peerObjects[message.from].rtcpeer = null;
          }
          const index = allWrtcInfo.peerList.indexOf(message.from);
          if (index > -1) {
            allWrtcInfo.peerList.splice(index, 1);
          }
          allWrtcInfo.peerObjects[message.from] = {};
          allWrtcInfo.peerList.push(message.from);
          sourceMakeWrtcPeer(message.from);
        } else if (message.messageType === SsMsgTypes.WRTC_MSG) {
          handleWrtcMessage(message);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  function displayMessageHandleOrSkip(message: ScreenshareMessage): void {
    if (message && !checkIfIsMyShare()) {
      // If this is a display client
      if (message.for === getMyId()) {
        // And the message is for this display
        debugprint('HANDLE MESSAGE FOR DISPLAY', message);
        if (message.messageType === SsMsgTypes.WRTC_MSG) {
          // SS#7v a, an offer message triggers the creation of RTCPeerConnection
          // Ensure peer object is created
          if (!allWrtcInfo.peerObjects[message.from]) {
            displayMakeWrtcPeer(message);
          }
          handleWrtcMessage(message);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Source specific WRTC
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Make new web rtc client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sourceMakeWrtcPeer(displayClientId: any) {
    if (allWrtcInfo.peerObjects[displayClientId]) {
      initRtcPeerConnectionForId(displayClientId);
    } else {
      console.log('ERROR > Screenshare > Unknown display client id?', displayClientId, allWrtcInfo);
    }
  }

  // ---------------------------------------------------------------------------
  // SS#7i. Source create UNIQUE RTCPeerConnection(RTCPC) per display
  function initRtcPeerConnectionForId(displayClientId: string) {
    const displayClient = allWrtcInfo.peerObjects[displayClientId];
    displayClient.rtcpeer = new RTCPeerConnection(PEER_CONFIG);
    // Standby data
    displayClient.iceCandidatesReadyToSend = [];
    displayClient.completedOfferAnswerResponse = false;
    // SS#7ii. Source creates handles on RTCPC to watch for events
    //					ice candidate are stored up until step xi.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayClient.rtcpeer.onicecandidate = (event: any) => {
      if (event.candidate) {
        debugprint('Source got ice candidate', Date.now());
        // Only if completed, then send
        if (displayClient.completedOfferAnswerResponse) {
          const message: ScreenshareMessage = {
            appId: props.id,
            from: getMyId(),
            for: displayClientId,
            messageType: SsMsgTypes.WRTC_MSG,
            content: JSON.stringify({ ice: event.candidate }),
          };
          socket.emit('ssmessage-sendToServer', message);
        } else {
          // Otherwise store until ready to send
          displayClient.iceCandidatesReadyToSend.push({ ice: event.candidate });
        }
      }
    };

    // SS#7ii. Source creates handles on RTCPC to watch for events
    //					Not quite an event handler, but sets up stream for sending
    // Collect stream (screenshare) track and add it to the connection
    if (allWrtcInfo && allWrtcInfo.stream) {
      allWrtcInfo.stream.getTracks().forEach((track: MediaStreamTrack) => {
        displayClient.rtcpeer.addTrack(track, allWrtcInfo.stream);
      });
    }

    // SS#7iii. Source generates offer
    //
    // Create offer, after creating, send to display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayClient.rtcpeer.createOffer(
      (offer: any) => {
        debugprint('Offer created');
        displayClient.rtcpeer.setLocalDescription(offer).then(() => {
          // SS#7iv.		Source sends offer to correct display
          const message: ScreenshareMessage = {
            appId: props.id,
            from: getMyId(),
            for: displayClientId,
            messageType: SsMsgTypes.WRTC_MSG,
            content: JSON.stringify({ sdp: displayClient.rtcpeer.localDescription }),
          };
          socket.emit('ssmessage-sendToServer', message);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      },
      (e: any) => {
        console.log('ERROR > screenshare > while creating offer', e);
      },
      OFFER_OPTIONS
    );
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Display specific WRTC
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  function displayMakeWrtcPeer(message: ScreenshareMessage): void {
    if (!message) {
      throw new Error('ERROR > displayMakeWrtcPeer > no message provided');
    }

    allWrtcInfo.peerObjects[message.from] = {};
    const peerObject = allWrtcInfo.peerObjects[message.from];
    // SS#7vi.		Display creates RTCPeerConnection(RTCPC)
    peerObject.rtcpeer = new RTCPeerConnection(PEER_CONFIG);
    // Standby data
    peerObject.iceCandidatesReadyToSend = [];
    peerObject.completedOfferAnswerResponse = false;

    // SS#7vii.	Display creates handles on RTCPC to watch for events
    //					ice candidates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peerObject.rtcpeer.onicecandidate = (event: any) => {
      if (event.candidate) {
        debugprint('Display got ice candidate at', Date.now());
        // Only if completed, then send
        if (peerObject.completedOfferAnswerResponse) {
          // SS#7ix.		Display sends answer back to source
          const iceMsg: ScreenshareMessage = {
            appId: props.id,
            from: getMyId(),
            for: SsMsgTypes.SS_SOURCE,
            messageType: SsMsgTypes.WRTC_MSG,
            content: JSON.stringify({ ice: event.candidate }),
          };
          socket.emit('ssmessage-sendToServer', iceMsg);
        } else {
          // Otherwise store until ready to send
          peerObject.iceCandidatesReadyToSend.push({ ice: event.candidate });
        }
      }
    };

    /*
    Below are two handles for ontrack and onaddstream.
    Both are necessary while clients can be both Chrome and Electron.

    The older handler onaddstream is planned to be phased out. But Electron only handles onaddstream.
    Their beta (v3) seems to work with onaddstream, but until then, the following two functions are necessary.

    TODO: determine if this has since been updated.
    */

    // SS#7vii.	Display creates handles on RTCPC to watch for events
    //					This is what actually receives stream and uses it on Display
    //					But, see above issue about ontrack vs onaddstream.
    // Handler for tracks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peerObject.rtcpeer.ontrack = (event: any) => {
      if (event.streams) {
        const track = event.streams[0];
        // const current = videoNode?.current ?? null;
        // const srcObject = current?.srcObject;

        if (videoNode && videoNode.current) {
          if (track.active && !videoNode.current.srcObject) {
            debugprint('Using stream from ontrack');
            videoNode.current.srcObject = track;
          } else {
            debugprint('Discarding ontrack stream received');
            if (!track.active) {
              debugprint(' - Reason: track inactive');
            } else if (videoNode.current.srcObject) {
              debugprint('Reason: streamElement already receiving');
            }
          }
        }
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peerObject.rtcpeer.onaddstream = (event: any) => {
      if (videoNode && videoNode.current) {
        if (event.stream && event.stream.active && !videoNode.current.srcObject) {
          debugprint('Using stream from onaddstream');
          videoNode.current.srcObject = event.stream;
        } else {
          debugprint('Discarding onaddstream stream received');
          if (!event.stream) {
            debugprint('Reason: No stream given');
          } else if (!event.stream.active) {
            debugprint('Reason: stream inactive');
          } else if (videoNode.current.srcObject) {
            debugprint('Reason: streamElement already receiving');
          }
        }
      }
    };
  } // displayMakeWrtcPeer

  // ---------------------------------------------------------------------------
  // Prior to this function, the different clients have different setup requirements.
  // Once it hits this handlewrtcmessage(), both Source and Display effects are here
  // This is because based on the msgObj.sdp.type, Source or Display gets appropriate values
  // E.g. only displays receive offers, only source receives answer
  // Functional handling of ice candidates are the same between Source and Display.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleWrtcMessage(message: ScreenshareMessage): void {
    const peerObject = allWrtcInfo.peerObjects[message.from];
    // Most webrtc messages will be objects as strings
    try {
      if (!message) {
        throw new Error('ERROR > handleWrtcMessage > message not provided');
      }
      const msgObj = JSON.parse(message.content);
      // Ice candidate message
      if (msgObj.ice !== undefined) {
        debugprint('Received ice from wrtc', msgObj);
        peerObject.rtcpeer
          .addIceCandidate(msgObj.ice)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((e: any) => {
            console.log('ERROR > screenshare > ice candidate error');
          });
      } else if (msgObj.sdp.type === 'offer') {
        // SS#7v.		Display receives offer from source
        //					ONLY displays use offers.
        peerObject.rtcpeer
          .setRemoteDescription(new RTCSessionDescription(msgObj.sdp))
          .then(() => {
            // SS#7viii.	Display uses offer to create answer
            return peerObject.rtcpeer.createAnswer();
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then(async (answer: any) => {
            await peerObject.rtcpeer.setLocalDescription(answer);
          })
          .then(() => {
            // this.sendMessage(JSON.stringify({sdp: peerObject.rtcpeer.localDescription}));
            debugprint('Is localDescription set?', peerObject.rtcpeer.localDescription);
            debugprint('Does currentLocalDescription?', peerObject.rtcpeer.currentLocalDescription);
            const ssAnswer: ScreenshareMessage = {
              appId: props.id,
              from: getMyId(),
              for: SsMsgTypes.SS_SOURCE,
              messageType: SsMsgTypes.WRTC_MSG,
              content: JSON.stringify({ sdp: peerObject.rtcpeer.localDescription }),
            };
            socket.emit('ssmessage-sendToServer', ssAnswer);
            debugprint('Offer completed', ssAnswer);
            sendStoredIceCandidates(message.from);
            debugprint('Sent stored ice candidates', Date.now());
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((e: any) => {
            console.log('ERROR > screenshare > offer handling error:', e);
          });
      } else if (msgObj.sdp.type === 'answer') {
        // SS#7x.		Source receives answer from display and applies it to correct RTCPC
        // 					Answers are only used by the source
        peerObject.rtcpeer
          .setRemoteDescription(new RTCSessionDescription(msgObj.sdp))
          .then(() => {
            debugprint('answer received', message);
            sendStoredIceCandidates(message.from);
          })
          .catch((error: any) => {
            console.log('ERROR > sceenshare > answer handling error', error);
          });
      }
    } catch (e) {
      console.log('ERROR > Screenshare > Unexpected message', message, e);
    }
  }
  // ---------------------------------------------------------------------------
  function sendStoredIceCandidates(forWho: string): void {
    const forWhoObject = allWrtcInfo.peerObjects[forWho];
    forWhoObject.completedOfferAnswerResponse = true;

    debugprint('ICE to share', forWhoObject.iceCandidatesReadyToSend.length);
    debugprint('   ', Date.now());
    for (let i = 0; i < forWhoObject.iceCandidatesReadyToSend.length; i++) {
      /*
        This timeout is being used to test if the effects are different if the
        state is set multiple times in the same frame
      */
      const iceString = JSON.stringify(forWhoObject.iceCandidatesReadyToSend[i]);
      setTimeout(() => {
        const iceMsg: ScreenshareMessage = {
          appId: props.id,
          from: getMyId(),
          for: forWho,
          messageType: SsMsgTypes.WRTC_MSG,
          content: iceString,
        };
        socket.emit('ssmessage-sendToServer', iceMsg);
        debugprint('SendStoredIceCandidates > sending ice' + i);
        debugprint('   ice value', iceString);
        debugprint('   ', Date.now());
      }, i * 500 + 500);
    }
    // Clear it out
    forWhoObject.iceCandidatesReadyToSend = [];
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  const videoStyle: CSSProperties = {
    width: '100%',
    height: '100%',
  };

  let contentToShow;

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  if (shouldShowMyScreenSharingOptions) {
    contentToShow = showShareOptionsJsx_radioVersion();
  } else {
    contentToShow = showVideoOrLoadingJsx();
  }

  // ---------------------------------------------------------------------------
  function showShareOptionsJsx_radioVersion() {
    const radioOptions = [];
    // Make jsx for each detected source
    debugprint('Screens sharing options', myScreenSharingOptions);
    for (let i = 0; i < myScreenSharingOptions.length; i++) {
      const option = myScreenSharingOptions[i];
      let name = option.name;
      name = name.replace('Screen', 'Monitor');
      radioOptions.push(
        <Radio value={option.id} key={'r' + i} colorScheme="teal" size="lg">
          {' '}
          {name} <img alt={name} src={option.thumbnail} />{' '}
        </Radio>
      );
    }

    // Calculate a scale factor based on the initial window size
    // Makes the content scale with the window size
    const winw = props.position.width;
    const wscale = winw / props.__meta__.initialSize.width;
    const winh = props.position.height;
    const hscale = winh / props.__meta__.initialSize.height;
    // Use the minimum of width and height scale to be safe
    const scale = `scale(${Math.min(wscale, hscale)})`;
    const id = props.id;
    // build the buttons for each source
    const rgWithShare = (
      <S3Modal title="Select a Monitor to Share" isOpen={shouldShowMyScreenSharingOptions} onClose={onClose} size="md">
        {/* <ModalCloseButton
          onClick={() =>
            act({
              type: 'close',
              id,
            })
          }
        /> */}
        <VStack p={2} spacing={10} transform={scale}>
          <RadioGroup name="monitors" onChange={set_screenSelection} value={screenSelection} key={'rgroup'}>
            <Stack direction="row" spacing={10} key={'rstack'}>
              {[...radioOptions]}
            </Stack>
          </RadioGroup>
          <Center>
            <HStack>
              <Tooltip placement="bottom" hasArrow={true} label={'Cancel'} openDelay={400}>
                <Button onClick={() => act({ type: 'close', id })}>Cancel </Button>
              </Tooltip>
              <Tooltip placement="bottom" hasArrow={true} label={'Start Screen Share'} openDelay={400}>
                <Button colorScheme="teal" onClick={() => setStartScreenShare(props.id, true)}>
                  Start
                </Button>
              </Tooltip>
            </HStack>
          </Center>
        </VStack>
      </S3Modal>
    );
    return rgWithShare;
  }
  function showVideoOrLoadingJsx() {
    let cts;
    // Non electron sources not allowed
    // Otherwise, must be a display client
    if (checkIfIsMyShare() && !isElectron()) {
      // cts = <div> Screensharing only works in SAGE3 client </div>;
      cts = (
        <Center w="100%" h="100%" bg="gray.700">
          <Box p={4}>
            <Center>
              <Box as="span" color="white" fontSize="3xl" fontWeight="bold" p="2rem">
                Screensharing is only supported with the SAGE3 Desktop Application.
              </Box>
            </Center>
            <br />
          </Box>
        </Center>
      );
    } else {
      cts = <video key={'ssvideo'} ref={videoNode} style={videoStyle} autoPlay={true}></video>;
      if (
        !videoNode.current ||
        !videoNode.current.srcObject ||
        !(videoNode.current.srcObject as any).active // eslint-disable-line
      ) {
        cts = [
          cts,
          <div key="ssload" style={{ position: 'absolute', margin: 'auto' }}>
            {' '}
            Waiting for source...{' '}
          </div>,
        ];
      }
    }
    return cts;
  }

  // Main application layout
  return (
    <Box
      p={0}
      m={2}
      bg="gray.200"
      color="black"
      shadow="base"
      rounded="md"
      border={2}
      borderColor="gray.100"
      d="flex"
      flex="1"
      alignItems="center"
      justifyContent="center"
      fontSize="xl"
      fontWeight="thin"
    >
      {/* Unsure if decorators should be applied */}
      {/* If not, the video node can become top level */}
      {contentToShow}
    </Box>
  );
};

/**
 * Check if browser is Electron based on the userAgent.
 * NOTE: this does a require check, UNLIKE web view app.
 *
 * @returns true or false.
 */
function isElectron() {
  const w = window as any; // eslint-disable-line
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron') && w.require;
}

export default AppsScreenshare;
function act(arg0: { type: string; id: any }): React.MouseEventHandler<HTMLButtonElement> | undefined {
  throw new Error('Function not implemented.');
}
