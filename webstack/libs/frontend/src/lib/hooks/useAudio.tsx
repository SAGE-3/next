import { useEffect, useRef, useState } from 'react';
import { ArticulateAPI } from '../api';

interface UseAudioProps {
  silenceThreshold?: number;
  silenceDuration?: number;
}

export const useAudio = ({ silenceThreshold = 0.01, silenceDuration = 1000 }: UseAudioProps) => {
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Float32Array | null>(null);
  const isRecording = useRef<boolean>(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string[]>([]);

  useEffect(() => {
    const fetchStream = async () => {
      if (!stream.current) {
        try {
          stream.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          console.log('Stream initialized:', stream.current);

          audioContext.current = new AudioContext();
          const source = audioContext.current.createMediaStreamSource(stream.current);
          analyser.current = audioContext.current.createAnalyser();
          source.connect(analyser.current);
          analyser.current.fftSize = 2048;
          dataArray.current = new Float32Array(analyser.current.fftSize);
        } catch (error) {
          console.error('Error accessing media devices.', error);
        }
      }
    };
    fetchStream();
  }, []);

  const detectSilence = (onSilence: () => void, onSound: () => void, threshold: number, duration: number) => {
    if (audioContext.current && analyser.current && dataArray.current) {
      let silenceStart: number | null = null;
      let hasSound = false;

      const checkForSilence = () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        analyser.current.getFloatTimeDomainData(dataArray.current!);

        const silence = dataArray.current!.every((sample) => Math.abs(sample) < threshold);
        if (silence) {
          if (silenceStart === null) {
            silenceStart = audioContext.current!.currentTime;
          } else if (audioContext.current!.currentTime - silenceStart > duration / 1000) {
            if (hasSound) {
              onSilence();
              hasSound = false;
            }
          }
        } else {
          hasSound = true;
          silenceStart = null;
          onSound();
        }

        requestAnimationFrame(checkForSilence);
      };

      checkForSilence();
    }
  };

  const startRecording = () => {
    if (stream.current) {
      const recorder = new MediaRecorder(stream.current, {
        mimeType: 'audio/webm',
      });
      recorderRef.current = recorder;

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > 0) {
          setAudioBlob(blob);
          const transcribedAudio = await ArticulateAPI.sendAudio({ blob });
          if (transcribedAudio.transcription !== ' Thank you.' || transcribedAudio.transcription !== '') {
            setTranscription((prev) => [...prev, transcribedAudio.transcription]);
            console.log(transcribedAudio.transcription, transcribedAudio.transcription !== ' Thank you.');
          }
        } else {
          console.log('Empty Audio');
        }
        chunks.length = 0; // Clear the chunks array
      };

      detectSilence(
        () => {
          if (recorderRef.current && isRecording.current) {
            recorderRef.current.stop();
            isRecording.current = false;
          }
        },
        () => {
          if (recorderRef.current && !isRecording.current) {
            recorderRef.current.start();
            isRecording.current = true;
          }
        },
        silenceThreshold,
        silenceDuration
      );
    }
  };

  return {
    startRecording,
    audioBlob,
    transcription,
  };
};
