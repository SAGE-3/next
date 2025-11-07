import React, { useEffect, useRef, useState } from "react";

interface AudioVncServiceProps {
  wsUrl: string;
  enabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const AudioVncService: React.FC<AudioVncServiceProps> = ({
  wsUrl,
  enabled = true,
  onConnectionChange,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);

  const initAudioContext = async () => {
    try {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 44100,
        latencyHint: "interactive",
      });

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Create ScriptProcessorNode for continuous audio playback
      scriptNodeRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        0,
        2
      );

      scriptNodeRef.current.onaudioprocess = (event) => {
        const outputBuffer = event.outputBuffer;
        const leftChannel = outputBuffer.getChannelData(0);
        const rightChannel = outputBuffer.getChannelData(1);

        const bufferLength = leftChannel.length;

        if (audioBufferRef.current.length >= bufferLength * 2) {
          // Deinterleave stereo data
          for (let i = 0; i < bufferLength; i++) {
            leftChannel[i] = audioBufferRef.current[i * 2];
            rightChannel[i] = audioBufferRef.current[i * 2 + 1];
          }

          // Remove consumed data from buffer
          const remaining = audioBufferRef.current.slice(bufferLength * 2);
          audioBufferRef.current = remaining;
        } else {
          // Not enough data, output silence
          leftChannel.fill(0);
          rightChannel.fill(0);
        }
      };

      scriptNodeRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("AudioContext initialization failed:", error);
    }
  };

  const addPCMData = (pcmData: ArrayBuffer) => {
    if (!audioContextRef.current) return;

    try {
      const int16Array = new Int16Array(pcmData);
      const float32Array = new Float32Array(int16Array.length);

      // Convert int16 to float32
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Append to audio buffer
      const newBuffer = new Float32Array(
        audioBufferRef.current.length + float32Array.length
      );
      newBuffer.set(audioBufferRef.current);
      newBuffer.set(float32Array, audioBufferRef.current.length);
      audioBufferRef.current = newBuffer;
    } catch (error) {
      console.warn("PCM processing failed:", error);
    }
  };

  const connectAudio = async () => {
    if (!enabled || !wsUrl) return;

    await initAudioContext();

    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      setIsConnected(true);
      onConnectionChange?.(true);
    };

    wsRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        addPCMData(event.data);
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      onConnectionChange?.(false);
    };

    wsRef.current.onerror = (error) => {
      console.error("Audio WebSocket error:", error);
      setIsConnected(false);
      onConnectionChange?.(false);
    };
  };

  const disconnectAudio = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioBufferRef.current = new Float32Array(0);
    setIsConnected(false);
    onConnectionChange?.(false);
  };

  useEffect(() => {
    if (enabled && wsUrl) {
      connectAudio();
    } else {
      disconnectAudio();
    }

    return () => {
      disconnectAudio();
    };
  }, [wsUrl, enabled]);

  return null; // No UI needed
};
