import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@chakra-ui/react';

const Dictation = () => {
  const streamRef = useRef<MediaStream>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const analyserRef = useRef<any>(null);
  const dataArrayRef = useRef<any>(null);
  const silenceStartRef = useRef<any>(null);
  const audioChunksRef = useRef<any>([]); // Reference to store ongoing audio chunks
  const mediaRecorderRef = useRef<any>(null); // Reference to the MediaRecorder instance

  useEffect(() => {
    const socket: any = io('http://127.0.0.1:5000/', {
      transports: ['websocket'],
      // cors: {
      //   origin: '*',
      // },
    });

    setSocketInstance(socket);
    socket.on('conection', (data: any) => {
      const output = JSON.parse(data);
      console.log(output);
    });

    socket.on('disconnect', (data: any) => {
      console.log(data);
    });

    socket.on('prediction', async (data: any) => {
      console.log('Received Prediction', data);
      // setPrediction(JSON.parse(data)["prediction"]);
      // let tmpPrediction = JSON.parse(data)["prediction"];
      // if (!tmpPrediction) {
      //   if (transcription.current.length < 1) {
      //     transcription.current =
      //       "generate an interesting chart for me to examine";
      //   }
      //   // sendMessageToGPT3(transcription.current);
      // }
      // resetTranscript();
      // console.log(JSON.parse(data)["prediction"]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Silence detection setup
  useEffect(() => {
    if (stream) {
      const audioContext = new (window.AudioContext || window.AudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.start(1000); // Start recording, and generate data events every 10ms

      checkForSilence();
    }
  }, [stream]);

  const checkForSilence = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const normalized = dataArrayRef.current[i] / 128 - 1;
      sum += normalized * normalized;
    }

    const average = Math.sqrt(sum / dataArrayRef.current.length);
    const silenceThreshold = 0.02; // Adjust based on your needs
    const currentTime = Date.now();

    if (average < silenceThreshold) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = currentTime; // Mark the start of silence
      } else if (currentTime - silenceStartRef.current > 1000) {
        // Check if silence lasted more than 1 second
        console.log('Silence exceeded 1 second');
        silenceStartRef.current = null; // Reset silence start after reporting
        mediaRecorderRef.current.stop(); // Stop recording to finalize the last chunk
        mediaRecorderRef.current.start(); // Immediately start a new recording session

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendAudioToAPI(audioBlob);

        audioChunksRef.current = []; // Reset the chunks array for the next audio segment
      }
    } else {
      silenceStartRef.current = null; // Reset silence start when sound is detected
    }

    requestAnimationFrame(checkForSilence);
  };
  useEffect(() => {
    const fetchStream = async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(mediaStream);
    };
    fetchStream();
  }, []);

  // useEffect(() => {
  //   if (socketInstance && stream) {
  //     socketInstance.emit('stream_audio', { stream: stream });
  //   }
  // }, []);

  const testPrediction = () => {
    if (socketInstance) {
      socketInstance.emit('predict_query', {
        query: 'the distribution of our customer demographics',
      });
    }
  };

  const sendAudioToAPI = (audioBlob: any) => {
    socketInstance?.emit('stream_audio', { blob: audioBlob });
  };

  return (
    <>
      <Button onClick={testPrediction}>test prediction</Button>
      <h1>Dictation</h1>
    </>
  );
};

export default Dictation;
