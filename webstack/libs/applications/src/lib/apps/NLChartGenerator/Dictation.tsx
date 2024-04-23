import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button, Input, InputGroup, InputRightElement } from '@chakra-ui/react';

const Dictation = (props: { send: (text: string) => void }) => {
  const [transcription, setTranscription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef<any>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

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
    socket.on('isCommand', (data: any) => {
      const output = JSON.parse(data);
      console.log(output);
    });

    socket.on('disconnect', (data: any) => {
      console.log(data);
    });

    socket.on('prediction', async (data: any) => {
      const parsedData = JSON.parse(data);
      console.log('Received Prediction', parsedData);

      // const prediction = data.prediction
      const final_query = parsedData.final_query;
      props.send(final_query);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true; // Continue listening for each speech
      recognition.current.interimResults = true; // Interim results are needed to keep the recognition active
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event: { resultIndex: any; results: string | any[] }) => {
        let finalTranscript = '';
        // Loop through the results from the speech recognition object.
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            // Check if the result is final
            finalTranscript += event.results[i][0].transcript;
          }
        }

        setTranscription(finalTranscript); // Update the state with the final transcript
      };

      recognition.current.onend = () => {
        setIsListening(false);
        startListening();
      };
      recognition.current.onerror = (event: { error: any }) => console.log('Speech recognition error', event.error);
    } else {
      console.log('Speech recognition not supported 😢');
    }
  }, []);

  useEffect(() => {
    if (transcription.length < 1) {
      return;
    } else {
      console.log('Transcription has been updated');
      sendAudioToAPI(transcription);
    }
  }, [transcription]);

  const sendAudioToAPI = (text: string) => {
    //send to localhost:5000
    if (socketInstance) {
      console.log('send audio', text);
      socketInstance.emit('predict_query', {
        query: text,
      });
    }
  };

  // Start listening
  const startListening = () => {
    if (recognition.current) {
      recognition.current.start();
      setIsListening(true);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  const testPrediction = () => {
    if (socketInstance) {
      socketInstance.emit('predict_query', {
        query: 'I ate a breakfast sandwich for lunch today',
      });
    }
  };

  const [input, setInput] = useState<string>('');

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      sendAudioToAPI(input);
    }
  };

  return (
    <div>
      <Button onClick={testPrediction}>Test</Button>
      <Button onClick={startListening} disabled={isListening}>
        Start Dictation
      </Button>
      <Button onClick={stopListening} disabled={!isListening}>
        Stop Dictation
      </Button>
      <InputGroup bg={'blackAlpha.100'}>
        <Input
          placeholder="Ask the agent to generate a chart..."
          size="md"
          variant="outline"
          _placeholder={{ color: 'inherit' }}
          onChange={handleChange}
          onKeyDown={onSubmit}
          value={input}
        />
        <InputRightElement onClick={() => sendAudioToAPI(input)}>send</InputRightElement>
      </InputGroup>
      <h1>Dictation:</h1>
      <p>{transcription}</p>
    </div>
  );
};

export default Dictation;
