import { useEffect, useRef, useState } from 'react';
import { ArticulateAPI } from '../api';

interface UseAudioProps {
  silenceThreshold?: number;
  silenceDuration?: number;
}

/**
 *
 * @param silenceThreshold - This number represents the volume of audio that is considered silence.
 * For example, if silence is below a volume of .1, it it consdiered silence, whereas a volume of
 * .5 (which might be something like people talking in the background), it is not considered silence.
 * @param silenceDuration - This number represents the duration of silence needed before sending to the backend
 * For example, 1000ms (1 second) of silence belew the silenceThreshold is needed before returning.
 * @returns StartRecording function to start recording
 * @returns audioBlob which contains the audio blob
 * @returns transcription which is the audio that is transcribed
 */
export const useAudio = ({ silenceThreshold = 0.1, silenceDuration = 300 }: UseAudioProps) => {
  // Audio Variables
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Float32Array | null>(null);
  const isNoise = useRef<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isEndOfCommand, setIsEndOfCommand] = useState<boolean>(false);
  const [finalText, setFinalText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');

  const fetchStream = async () => {
    if (!stream.current) {
      try {
        // Ask for permission to use the microphone and get the audio stream
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log('Microphone stream started:', stream.current);

        audioContext.current = new AudioContext();
        const source = audioContext.current.createMediaStreamSource(stream.current);

        // Create an analyser to inspect the audio data
        analyser.current = audioContext.current.createAnalyser();
        source.connect(analyser.current);

        // Set how much detail the analyser should use
        analyser.current.fftSize = 2048;
        dataArray.current = new Float32Array(analyser.current.fftSize);
      } catch (error) {
        console.error('Error accessing microphone.', error);
      }
    }
  };

  useEffect(() => {
    fetchStream();
  }, []);

  const detectSilence = (onSilence: () => void, onSound: () => void, threshold: number, duration: number) => {
    if (audioContext.current && analyser.current && dataArray.current) {
      let silenceStart: number | null = null;
      let hasSound = false;

      const checkForSilence = () => {
        if (!audioContext.current || !analyser.current || !dataArray.current) {
          return; // Exit if audioContext, analyser, or dataArray are not available
        }

        // Get the audio data into the dataArray
        analyser.current.getFloatTimeDomainData(dataArray.current);

        // Check if all audio samples are below the threshold (i.e., silence)
        const silence = dataArray.current.every((sample) => Math.abs(sample) < threshold);
        if (silence) {
          if (silenceStart === null) {
            // Mark the start time of silence
            silenceStart = audioContext.current.currentTime;
          } else if (audioContext.current.currentTime - silenceStart > duration / 1000) {
            // If silence duration exceeds the threshold, trigger onSilence
            if (hasSound) {
              onSilence();
              hasSound = false;
            }
          }

          // If silence duration exceeds 1400ms, set endOfCommand to true
          if (audioContext.current.currentTime - silenceStart > 1.4) {
            setIsEndOfCommand(true);
          }
        } else {
          // Reset silenceStart if sound is detected and trigger onSound
          hasSound = true;
          silenceStart = null;
          onSound();
          setIsEndOfCommand(false); // Set endOfCommand to false when speech is detected
        }

        // Continuously check for silence
        requestAnimationFrame(checkForSilence);
      };

      checkForSilence();
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = () => {
    fetchStream().then(() => {
      if (stream.current) {
        setIsRecording(true);

        // Create a MediaRecorder to record the audio stream
        const recorder = new MediaRecorder(stream.current, {
          mimeType: 'audio/webm',
        });
        recorderRef.current = recorder;

        const chunks: BlobPart[] = [];

        // Save audio data chunks as they become available
        recorder.ondataavailable = (e) => chunks.push(e.data);

        // When the recording stops, process the audio data
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          if (blob.size > 0) {
            setAudioBlob(blob);
            // Send the audio blob to the API for transcription
            const transcribedAudio = await ArticulateAPI.sendAudio({ blob });
            // Transcription has a bias to say Thank you. I just decided to ignore these commen
            if (transcribedAudio.transcription !== '') {
              setTranscription((prev) => [...prev, transcribedAudio.transcription]);
              setInterimText((prev) => prev + ' ' + transcribedAudio.transcription);
            }
          }
          chunks.length = 0; // Clear the chunks array
        };

        // Detect silence and sound, and start or stop the recorder accordingly
        detectSilence(
          () => {
            if (recorderRef.current && isNoise.current) {
              recorderRef.current.stop();
              isNoise.current = false;
            }
          },
          () => {
            if (recorderRef.current && !isNoise.current) {
              recorderRef.current.start();
              isNoise.current = true;
            }
          },
          silenceThreshold,
          silenceDuration
        );
      }
    });
  };

  useEffect(() => {
    if (isEndOfCommand) {
      setFinalText(interimText);
      setInterimText('');
    }
    console.log(isEndOfCommand);
  }, [interimText, isEndOfCommand]);

  const stopRecording = () => {
    setIsRecording(false);

    // Stop the MediaRecorder
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    // Close the audio context
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null; // Reset audioContext to allow re-initialization
    }

    // Stop all tracks in the stream and reset the stream
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop());
      stream.current = null; // Reset stream to allow re-initialization
    }
  };

  return {
    startRecording,
    stopRecording,
    audioBlob,
    transcription,
    finalText, // Return endOfCommand state
    isRecording,
    isNoise,
  };
};
