/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import ky, { HTTPError } from 'ky';

import { Box, useColorModeValue, Flex, Input, InputGroup, InputRightElement, useToast, List, ListItem, ListIcon, Tooltip, Spinner } from '@chakra-ui/react';

import { MdSend, MdSettings } from 'react-icons/md';

import { useUIStore, useHexColor, useUser, useAppStore, useConfigStore, apiUrls } from '@sage3/frontend';
import { genId, AskRequest, AskResponse, SError, AgentRoutes, HealthResponse, WebQuery, WebAnswer } from '@sage3/shared';

import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppState } from '@sage3/applications/schema';


/**
 * Makes the actual RPC call using ky library
 * @param mth string endpoint name
 * @param data object data to send
 * @returns 
 */
const makeRpcPost = async (mth: string, data: object) => {
  try {
    const base = apiUrls.ai.agents.base;
    const response = await ky.post<Response>(`${base}${mth}`, { json: data }).json();
    return response;
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      const err: SError = await error.response.json();
      return err;
    } else {
      return { message: "Unknown error" };
    }
  }
}
const makeRpcGet = async (mth: string) => {
  try {
    const base = apiUrls.ai.agents.base;
    const response = await ky.get<Response>(`${base}${mth}`).json();
    return response;
  } catch (e) {
    const error = e as HTTPError<Response>;
    if (error.name === 'HTTPError') {
      const err: SError = await error.response.json();
      return err;
    } else {
      return { message: "Unknown error" };
    }
  }
}

/**
 * Check the health of the agent server
 * @param mth string endpoint name
 * @param data SumRequest payload
 * @returns 
 */
const callStatus = async () => {
  return makeRpcGet(AgentRoutes.status) as Promise<HealthResponse | SError>;
};
const callAsk = async (data: AskRequest) => {
  return makeRpcPost(AgentRoutes.ask, data) as Promise<AskResponse | SError>;
};
const callSummary = async (data: AskRequest) => {
  return makeRpcPost(AgentRoutes.summary, data) as Promise<AskResponse | SError>;
};
const callWeb = async (data: WebQuery) => {
  return makeRpcPost(AgentRoutes.web, data) as Promise<WebAnswer | SError>;
};
const callWebshot = async (data: WebQuery) => {
  return makeRpcPost(AgentRoutes.webshot, data) as Promise<WebAnswer | SError>;
};

export function AIChat(props: { model: string }) {
  const { roomId, boardId } = useParams();
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.500', 'gray.100');
  // Stores
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const createApp = useAppStore((state) => state.create);
  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Input text for query
  const [input, setInput] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBox = useRef<null | HTMLDivElement>(null);
  // Context of the chat
  const [context, setContext] = useState('');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [actions, setActions] = useState<any[]>([]);
  const [position, setPosition] = useState([0, 0]);
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  const [status, setStatus] = useState(false);

  // Display some notifications
  const toast = useToast();

  useEffect(() => {
    if (user) {
      const u = user.data.name;
      const firstName = u.split(' ')[0];
      setUsername(firstName);

      navigator.geolocation.getCurrentPosition(function (location) {
        setLocation(location.coords.latitude + ',' + location.coords.longitude);
      }, function (e) { console.log('Location> error', e); });
    }
  }, [user]);

  useEffect(() => {
    callStatus().then((res) => {
      if ("message" in res) {
        console.log('Health> error', res.message);
      } else {
        console.log('Health> ', res.success);
        setStatus(true);
      }
    });
  }, []);

  const newMessage = async (new_input: string) => {
    if (!user) return;
    if (!roomId) return;
    if (!boardId) return;
    // Generate a unique id for the query
    const id = genId();
    // Build the query
    const question: AskRequest = {
      ctx: {
        prompt: context || '',
        pos: position, roomId, boardId
      }, id: id,
      user: username,
      location: location,
      q: new_input,
      model: props.model,
    };
    if (new_input === 'summary') {
      // Invoke the agent
      const response = await callSummary(question);
      setIsWorking(false);
      if ('message' in response) {
        toast({
          title: 'Error',
          description: response.message || 'Error sending query to the agent. Please try again.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      } else {
        // Store the agent's response
        setResponse(response.r);
        // Get the propose actions
        if (response.actions) {
          setActions(response.actions);
        }
        // Increase the position
        setPosition([position[0] + (400 + 20), position[1]]);
      }
    } else if (new_input.startsWith('webshot')) {
      // Build the query
      const q: WebQuery = {
        ctx: {
          prompt: context || '',
          pos: position, roomId, boardId
        },
        user: username,
        url: new_input.split(' ')[1],
      };
      // Invoke the agent
      const response = await callWebshot(q);
      setIsWorking(false);
      if ('message' in response) {
        toast({
          title: 'Error',
          description: response.message || 'Error sending web query to the agent. Please try again.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      } else {
        // Store the agent's response
        setResponse(response.r);
        // Get the propose actions
        if (response.actions) {
          setActions(response.actions);
        }
        // Increase the position
        setPosition([position[0] + (400 + 20), position[1]]);
      }
    } else if (new_input.startsWith('web')) {
      // Build the query
      const q: WebQuery = {
        ctx: {
          prompt: context || '',
          pos: position, roomId, boardId
        },
        user: username,
        url: new_input.split(' ')[1],
      };
      // Invoke the agent
      const response = await callWeb(q);
      setIsWorking(false);
      if ('message' in response) {
        toast({
          title: 'Error',
          description: response.message || 'Error sending web query to the agent. Please try again.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      } else {
        // Store the agent's response
        setResponse(response.r);
        // Get the propose actions
        if (response.actions) {
          setActions(response.actions);
        }
        // Increase the position
        setPosition([position[0] + (400 + 20), position[1]]);
      }
    } else {
      // Invoke the agent
      // const response = await AiAPI.agents.ask(question);
      const response = await callAsk(question);
      setIsWorking(false);
      if ('message' in response) {
        toast({
          title: 'Error',
          description: response.message || 'Error sending query to the agent. Please try again.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      } else {
        // Store the agent's response
        setResponse(response.r);
        // Get the propose actions
        if (response.actions) {
          setActions(response.actions);
        }
        // Increase the position
        setPosition([position[0] + (400 + 20), position[1]]);
      }

    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    setIsWorking(true);
    setInput('');
    setResponse('');
    setActions([]);
    setQuestion(text);
    await newMessage(text);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };
  const applyAction = (action: any) => async () => {
    // Test JSON data
    if (action.type === 'create_app') {
      // Create a new duplicate app
      const type = action.app as AppName;
      const size = action.data.size;
      const pos = action.data.position;
      const state = action.state;
      // Create the app
      createApp({
        title: type,
        roomId: roomId!,
        boardId: boardId!,
        position: pos,
        size: size,
        rotation: { x: 0, y: 0, z: 0 },
        type: type,
        state: { ...(initialValues[type] as AppState), ...state },
        raised: true,
        dragging: false,
        pinned: false,
      });
      toast({
        title: 'Info',
        description: 'Action applied.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } else {
      console.log('Action> not valid');
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Store initial position
    const x = Math.floor(-boardPosition.x + 50 / scale);
    const y = Math.floor(-boardPosition.y + 140 / scale);
    setPosition([x, y]);
  }, [inputRef]);


  return (
    <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="400px" w="100%">
      <Box
        flex={1}
        bg={bgColor}
        borderRadius={'md'}
        overflowY="scroll"
        ref={chatBox}
        css={{
          '&::-webkit-scrollbar': {
            width: '12px',
          },
          '&::-webkit-scrollbar-track': {
            '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: `${scrollColor}`,
            borderRadius: '6px',
            outline: `3px solid ${bgColor}`,
          },
        }}
      >
        <Box display={'flex'} justifyContent={'right'}>
          {question && <Box
            color="white"
            rounded={'md'}
            boxShadow="md"
            fontFamily="arial"
            textAlign={'right'}
            bg={myColor}
            p={1}
            m={3}
            maxWidth="80%"
            userSelect={'none'}
          >
            {question}
          </Box>}
        </Box>

        <Box display={'flex'} justifyContent={'left'}>
          {response && <Box
            color="black"
            rounded={'md'}
            boxShadow="md"
            fontFamily="arial"
            textAlign={'left'}
            bg={textColor}
            p={1}
            m={3}
            maxWidth="80%"
            userSelect={'none'}
          >
            {response}
          </Box>}
        </Box>

        <Box display={'flex'} justifyContent={'left'}>
          {actions &&
            <List>
              {actions.map((action, index) => (
                <Box
                  color="black"
                  rounded={'md'}
                  boxShadow="md"
                  fontFamily="arial"
                  textAlign={'left'}
                  bg={textColor}
                  p={1}
                  m={3}
                  // maxWidth="80%"
                  userSelect={'none'}
                  _hover={{ background: "purple.300" }}
                  background={'purple.200'}
                  onDoubleClick={applyAction(action)}
                  key={"list-" + index}
                >
                  <Tooltip label="Double click to apply action" aria-label="A tooltip">
                    <ListItem key={index}><ListIcon as={MdSettings} color='green.500' />
                      Show the result on the board
                    </ListItem>
                  </Tooltip>
                </Box>
              ))}
            </List>
          }
        </Box>

      </Box>

      <InputGroup bg={'blackAlpha.100'}>
        <Input
          placeholder={"Ask SAGE Intelligence"}
          size="md"
          variant="outline"
          _placeholder={{ color: 'inherit' }}
          onChange={handleChange}
          onKeyDown={onSubmit}
          value={input}
          ref={inputRef}
        />
        <InputRightElement onClick={sendMessage}>
          {isWorking ? <Spinner /> : <MdSend color="green.500" />}
        </InputRightElement>
      </InputGroup>

    </Flex>
  );
}