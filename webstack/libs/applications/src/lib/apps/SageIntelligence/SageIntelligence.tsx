// import { useMemo, useRef, useState, Fragment, useEffect } from 'react';
// import { useParams } from 'react-router';
// import {
//   Box,
//   Collapse,
//   Flex,
//   HStack,
//   IconButton,
//   InputGroup,
//   InputRightElement,
//   Text,
//   Textarea,
//   Tooltip,
//   useColorMode,
//   useColorModeValue,
//   useToast,
//   VStack,
//   Button,
//   ButtonGroup,
// } from '@chakra-ui/react';
// // Using React Icons for mode toggle and panel icons
// import { MdDarkMode, MdLightMode, MdSend, MdChangeCircle, MdFileDownload, MdContentCopy, MdDelete } from 'react-icons/md';
// import { LuPanelTopOpen, LuPanelTopClose } from 'react-icons/lu';
// import { format } from 'date-fns';
// import DOMPurify from 'dompurify';
// import {
//   useAppStore,
//   useHexColor,
//   useUser,
//   serverTime,
//   downloadFile,
//   useUIStore,
// } from '@sage3/frontend';
// import { genId } from '@sage3/shared';
// import { App } from '../../schema';
// import { state as AppState, init as initialState } from './index';
// import { AppWindow } from '../../components';

// interface MessageProps {
//   isMe: boolean;
//   message: {
//     type: string;
//     id: string;
//     creationDate: number;
//     payload: string;
//     userName: string;
//     userId: string;
//     source?: string;
//   };
// }

// interface UploadedItem {
//   id: string;
//   title: string;
//   type: string;
//   uploadDate: number;
//   uploadedBy: string;
// }

// // Message bubble with hover-to-show copy button.
// const MessageBubble: React.FC<MessageProps> = ({ isMe, message }) => {
//   const bg = isMe ? 'blue.500' : 'purple.500';
//   const align = isMe ? 'flex-end' : 'flex-start';
//   const toast = useToast();

//   const handleCopy = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     navigator.clipboard.writeText(message.payload).then(() =>
//       toast({ title: 'Copied', status: 'success', duration: 2000, isClosable: true })
//     );
//   };

//   const handleScroll = () => {
//     if (message.source) {
//       const elem = document.getElementById(`msg-${message.source}`);
//       elem?.scrollIntoView({ behavior: 'smooth' });
//     }
//   };

//   return (
//     <Flex justify={align} width="100%" px={4} py={2} id={`msg-${message.id}`}> 
//       <Box
//         role="group"
//         position="relative"
//         bg={bg}
//         color="white"
//         p={3}
//         borderRadius="md"
//         boxShadow="md"
//         maxW="80%"
//         _hover={{ opacity: 0.9 }}
//         onClick={handleScroll}
//       >
//         <Tooltip label={new Date(message.creationDate).toLocaleString()} fontSize="xs">
//           <Text fontSize="sm" whiteSpace="pre-wrap">
//             {message.userName === 'Docusage'
//               ? <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.payload) }} />
//               : message.payload}
//           </Text>
//         </Tooltip>
//         <IconButton
//           aria-label="copy"
//           icon={<MdContentCopy />}
//           size="xs"
//           variant="ghost"
//           position="absolute"
//           top={1}
//           right={1}
//           opacity={0}
//           _groupHover={{ opacity: 1 }}
//           onClick={handleCopy}
//         />
//       </Box>
//     </Flex>
//   );
// };

// // Main App component
// function AppComponent(props: App): JSX.Element {
//   const s = props.data.state as AppState;
//   const { roomId, boardId } = useParams();
//   const { user } = useUser();
//   const toast = useToast();
//   const { colorMode, toggleColorMode } = useColorMode();

//   const bgApp = useColorModeValue('gray.100', 'gray.800');
//   const chatBg = useColorModeValue('gray.200', 'gray.700');
//   const inputBg = useColorModeValue('gray.200', 'gray.700');

//   const [input, setInput] = useState('');
//   const [sortedMessages, setSortedMessages] = useState(s.messages || []);
//   const [uploaded, setUploaded] = useState<UploadedItem[]>(s.uploaded || []);
//   const [isPanelOpen, setPanelOpen] = useState(false);
//   const chatRef = useRef<HTMLDivElement>(null);

//   const updateState = useAppStore((st) => st.updateState);
//   const apps = useAppStore((st) => st.apps);
//   const selectedApps = useUIStore((st) => st.selectedAppsIds);

//   // Sync messages
//   useEffect(() => {
//     setSortedMessages([...s.messages].sort((a, b) => a.creationDate - b.creationDate));
//   }, [s.messages]);
//   // Sync uploaded list
//   useEffect(() => {
//     setUploaded(s.uploaded || []);
//   }, [s.uploaded]);
//   // Auto-scroll
//   useEffect(() => {
//     chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
//   }, [sortedMessages]);
//     // Collision-based upload: add apps overlapping this chat window
//   const checkOverlap = (app1: App, app2: App): boolean => {
//     const rect1 = {
//       x: app1.data.position.x,
//       y: app1.data.position.y,
//       width: app1.data.size.width,
//       height: app1.data.size.height,
//     };
//     const rect2 = {
//       x: app2.data.position.x,
//       y: app2.data.position.y,
//       width: app2.data.size.width,
//       height: app2.data.size.height,
//     };
//     return (
//       rect1.x < rect2.x + rect2.width &&
//       rect1.x + rect1.width > rect2.x &&
//       rect1.y < rect2.y + rect2.height &&
//       rect1.y + rect1.height > rect2.y
//     );
//   };

//   useEffect(() => {
//     const myApp = apps.find(a => a._id === props._id);
//     if (!myApp) return;
//     const newUploads: UploadedItem[] = [];
//     apps.forEach(other => {
//       if (other._id === props._id) return;
//       if (checkOverlap(myApp, other)) {
//         const already = uploaded.find(u => u.id === other._id);
//         if (!already) {
//           newUploads.push({
//             id: other._id,
//             title: other.data.title,
//             type: other.data.type,
//             uploadDate: Date.now(),
//             uploadedBy: user?.data.name || 'unknown',
//           });
//         }
//       }
//     });
//     if (newUploads.length > 0) {
//       const updated = [...uploaded, ...newUploads];
//       setUploaded(updated);
//       updateState(props._id, { ...s, uploaded: updated });
//     }
//   }, [apps, isPanelOpen]);

//   const showToast = (title: string, desc: string, status: any) =>
//     toast({ title, description: desc, status, duration: 3000, isClosable: true });

//   const sendMessage = async (): Promise<void> => {
//     const text = input.trim();
//     if (!text) {
//       showToast('Error', 'Please enter a message', 'error');
//       return;
//     }
//     const now = await serverTime();
//     const userMsg = {
//       id: genId(), userId: user?._id || '',
//       creationDate: now.epoch, payload: text,
//       userName: user?.data.name || '', type: 'query',
//     };
//     updateState(props._id, { ...s, messages: [...s.messages, userMsg] });
//     setInput('');
//     try {
//       const res = await fetch('http://localhost:5050/chat-message', {
//         method: 'POST', headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ roomId, boardId, appId: props._id, message: userMsg }),
//       });
//       const data = await res.json();
//       const botMsg = {
//         id: genId(), userId: '', creationDate: Date.now(),
//         payload: data.response, userName: 'Docusage', type: data.type, source: data.source,
//       };
//       updateState(props._id, { ...s, messages: [...s.messages, userMsg, botMsg] });
//     } catch {
//       showToast('Error', 'Failed to send message', 'error');
//     }
//   };

//   const resetChat = () =>
//     updateState(props._id, { ...s, messages: initialState.messages, uploaded: [] });
//     const togglePanel = () => setPanelOpen(!isPanelOpen);

//   // Handle drag-and-drop uploads onto chat window
//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     const data = e.dataTransfer.getData('app_state');
//     if (!data) return;
//     try {
//       const stateObj = JSON.parse(data);
//       // Assume first source is the app ID
//       const appId = stateObj.sources?.[0];
//       const droppedApp = apps.find(a => a._id === appId);
//       if (!droppedApp) return;
//       const newItem: UploadedItem = {
//         id: droppedApp._id,
//         title: droppedApp.data.title,
//         type: droppedApp.data.type,
//         uploadDate: Date.now(),
//         uploadedBy: user?.data.name || 'unknown',
//       };
//       if (!uploaded.some(u => u.id === newItem.id)) {
//         setUploaded(prev => {
//           const updated = [...prev, newItem];
//           updateState(props._id, { ...s, uploaded: updated });
//           return updated;
//         });
//       }
//     } catch {
//       // invalid JSON
//     }
//   };

//   return (
//     <AppWindow app={props}>
//       <Flex direction="column" h="100%" bg={bgApp} p={4} borderRadius="md">
//         {/* Chat Window */}
//         <Box
//           flex={1}
//           overflowY="auto"
//           ref={chatRef}
//           bg={chatBg}
//           borderRadius="md"
//           p={2}
//           onDragOver={e => e.preventDefault()}
//           onDrop={handleDrop}
//           minH={'150px'}
//         >
//           {sortedMessages.map(msg => (
//             <MessageBubble key={msg.id} isMe={msg.userName !== 'Docusage'} message={msg} />
//           ))}
//         </Box>
//         {/* Input & Controls */}
//         <VStack spacing={3} mt={4}>
//           <InputGroup bg={inputBg} borderRadius="md">
//             <Textarea
//               value={input} placeholder="Type a message..."
//               onChange={e => setInput(e.target.value)}
//               onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
//               resize="none" p={4} bg={inputBg}
//             />
//             <InputRightElement>
//               <IconButton aria-label="send" icon={<MdSend />} onClick={sendMessage} />
//             </InputRightElement>
//           </InputGroup>

//           <HStack spacing={4} w="100%" justify="center">
//             <Tooltip label="Reset Chat"><IconButton fontSize={31} aria-label="reset" icon={<MdChangeCircle />} onClick={resetChat} /></Tooltip>
//             <Tooltip label="Show uplaoded apps"><IconButton fontSize={30} aria-label="panel" icon={isPanelOpen ? <LuPanelTopClose /> : <LuPanelTopOpen />} onClick={togglePanel} /></Tooltip>
//             <Tooltip label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
//               <IconButton fontSize={30} aria-label="toggle-color-mode" icon={colorMode === 'light' ? <MdDarkMode /> : <MdLightMode />} onClick={toggleColorMode} />
//             </Tooltip>
//             <Tooltip label="Download Chat History">
//               <IconButton
//                 fontSize={30}
//                 aria-label="download"
//                 icon={<MdFileDownload />}
//                 onClick={() => {
//                   const content = sortedMessages
//   .map(m => `${format(new Date(m.creationDate), 'yyyy-MM-dd HH:mm:ss')} ${m.userName}> ${m.payload}`)
//   .join('\n');
//                   const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
//                   downloadFile(url, `sage-${format(new Date(), 'yyyy-MM-dd-HH:mm:ss')}.txt`);
//                 }}
//               />
//             </Tooltip>
//           </HStack>
//         </VStack>
//         {/* Uploaded Apps Panel */}
//         <Collapse in={isPanelOpen} animateOpacity>
//           <Box bg={useColorModeValue('gray.100', 'gray.600')} p={4} mt={4} borderRadius="md" maxH="300px" minH="150px" overflowY="auto">
//             <Text fontSize="lg" mb={2}>Uploaded Apps ({uploaded.length})</Text>
//             <Text fontSize="sm" mb={2}>Drag an app into chat. Click to append its ID.</Text>
//             <Box>
//               <ol>
//                 {uploaded.map(item => (
//                   <li key={item.id}>
//                     <HStack justify="space-between" p={2} _hover={{ bg: useColorModeValue('gray.200','gray.500') }} borderRadius="md">
//                       <Text>{item.title} <Text as="span" fontSize="xs" color="gray.500">({item.id.slice(0,8)})</Text></Text>
//                       <IconButton aria-label="delete" icon={<MdDelete />} size="sm" onClick={() => {
//                         const nl = uploaded.filter(u => u.id !== item.id);
//                         setUploaded(nl);
//                         updateState(props._id, { ...s, uploaded: nl });
//                       }} />
//                     </HStack>
//                   </li>
//                 ))}
//               </ol>
//             </Box>
//           </Box>
//         </Collapse>
//         <Box bg={useColorModeValue('blackAlpha.100','gray.700')} p={2} mt={4} borderRadius="sm">
//           <Text textAlign="center" fontSize="xs" color={useColorModeValue('gray.600','gray.300')}
//           >AI can make mistakes. User caution is advised.</Text>
//         </Box>
//       </Flex>
//     </AppWindow>
//   );
// }

// // Dummy toolbars (handled within AppComponent)
// function ToolbarComponent(props: App): JSX.Element { return <></>; }
// const GroupedToolbarComponent = (): JSX.Element => <></>;

// export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };


import { useMemo, useRef, useState, Fragment, useEffect } from 'react';
import { keyframes } from '@emotion/react';
import {
  Box,
  Collapse,
  Flex,
  HStack,
  IconButton,
  InputGroup,
  InputRightElement,
  Text,
  Textarea,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useToast,
  VStack,
  Button,
  ButtonGroup,
} from '@chakra-ui/react';
import { MdDarkMode, MdLightMode, MdSend, MdChangeCircle, MdFileDownload, MdContentCopy, MdDelete } from 'react-icons/md';
import { LuPanelTopOpen, LuPanelTopClose } from 'react-icons/lu';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  useAppStore,
  useHexColor,
  useUser,
  serverTime,
  downloadFile,
  useUIStore,
} from '@sage3/frontend';
import { genId } from '@sage3/shared';
import { App } from '../../schema';
import { state as AppState, init as initialState } from './index';
import { AppWindow } from '../../components';
import { useParams } from 'react-router-dom';

interface MessageProps {
  isMe: boolean;
  message: {
    type: string;
    id: string;
    creationDate: number;
    payload: string;
    userName: string;
    userId: string;
    source?: string;
  };
}

interface UploadedItem {
  id: string;
  title: string;
  type: string;
  uploadDate: number;
  uploadedBy: string;
}

// Message bubble with hover-to-show copy button.
const MessageBubble: React.FC<MessageProps> = ({ isMe, message }) => {
  const bg = isMe ? 'blue.500' : 'purple.500';
  const align = isMe ? 'flex-end' : 'flex-start';
  const toast = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.payload).then(() =>
      toast({ title: 'Copied', status: 'success', duration: 2000, isClosable: true })
    );
  };

  const handleScroll = () => {
    if (message.source) {
      const elem = document.getElementById(`msg-${message.source}`);
      elem?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Flex justify={align} width="100%" px={4} py={2} id={`msg-${message.id}`}>
      <Box
        role="group"
        position="relative"
        bg={bg}
        color="white"
        p={3}
        borderRadius="md"
        boxShadow="md"
        maxW="80%"
        _hover={{ opacity: 0.9 }}
        onClick={handleScroll}
      >
        <Tooltip label={new Date(message.creationDate).toLocaleString()} fontSize="xs">
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {message.userName === 'Docusage'
              ? <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.payload) }} />
              : message.payload}
          </Text>
        </Tooltip>
        <IconButton
          aria-label="copy"
          icon={<MdContentCopy />}
          size="xs"
          variant="ghost"
          position="absolute"
          top={1}
          right={1}
          opacity={0}
          _groupHover={{ opacity: 1 }}
          onClick={handleCopy}
        />
      </Box>
    </Flex>
  );
};

// Typing bubble animation
const blink = keyframes`
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
`;

export const TypingBubble: React.FC = () => {
  // container bg
  const bg = useColorModeValue('purple.500', 'purple.400');
  // dot color
  const dotColor = useColorModeValue('white', 'gray.200');

  return (
    <Flex justify="flex-start" w="100%" px={4} py={2}>
      <Box bg={bg} p={3} borderRadius="md" maxW="60%">
        <HStack spacing={2}>
          {[0, 0.2, 0.4].map((delay) => (
            <Box
              key={delay}
              w="8px"
              h="8px"
              borderRadius="50%"
              bg={dotColor}                             // ← dot needs a bg!
              sx={{                                      // ← Chakra’s way to inject raw CSS
                animation: `${blink} 1.4s infinite both`,
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </HStack>
      </Box>
    </Flex>
  );
};

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { roomId, boardId } = useParams();
  const { user } = useUser();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();

  const bgApp = useColorModeValue('gray.100', 'gray.800');
  const chatBg = useColorModeValue('gray.200', 'gray.700');
  const inputBg = useColorModeValue('gray.200', 'gray.700');

  const [input, setInput] = useState('');
  const [sortedMessages, setSortedMessages] = useState(s.messages || []);
  const [uploaded, setUploaded] = useState<UploadedItem[]>(s.uploaded || []);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const updateState = useAppStore((st) => st.updateState);
  const apps = useAppStore((st) => st.apps);
  const selectedApps = useUIStore((st) => st.selectedAppsIds);

  useEffect(() => {
    setSortedMessages([...s.messages].sort((a, b) => a.creationDate - b.creationDate));
  }, [s.messages]);

  useEffect(() => {
    setUploaded(s.uploaded || []);
  }, [s.uploaded]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [sortedMessages, isWaiting]);

  // ... collision-based upload effect stays unchanged ...

  const showToast = (title: string, desc: string, status: any) =>
    toast({ title, description: desc, status, duration: 3000, isClosable: true });

  const sendMessage = async (): Promise<void> => {
    if (isWaiting) return;  // prevent double-send

    const text = input.trim();
    if (!text) {
      showToast('Error', 'Please enter a message', 'error');
      return;
    }

    const now = await serverTime();
    const userMsg = {
      id: genId(),
      userId: user?._id || '',
      creationDate: now.epoch,
      payload: text,
      userName: user?.data.name || '',
      type: 'query',
    };
    updateState(props._id, { ...s, messages: [...s.messages, userMsg] });
    setInput('');

    setIsWaiting(true);
    try {
      const res = await fetch('http://localhost:5050/chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, boardId, appId: props._id, message: userMsg }),
      });
      const data = await res.json();
      const botMsg = {
        id: genId(),
        userId: '',
        creationDate: Date.now(),
        payload: data.response,
        userName: 'Docusage',
        type: data.type,
        source: data.source,
      };
      updateState(props._id, { ...s, messages: [...s.messages, userMsg, botMsg] });
    } catch {
      showToast('Error', 'Failed to send message', 'error');
    } finally {
      setIsWaiting(false);
    }
  };

  const resetChat = () =>
    updateState(props._id, { ...s, messages: initialState.messages, uploaded: [] });
  const togglePanel = () => setPanelOpen(!isPanelOpen);

  // const handleDrop = (e: React.DragEvent) => {
  //   // … your existing drop logic …
  // };

  return (
    <AppWindow app={props}>
      <Flex direction="column" h="100%" bg={bgApp} p={4} borderRadius="md">
        {/* Chat Window */}
        <Box
          flex={1}
          overflowY="auto"
          ref={chatRef}
          bg={chatBg}
          borderRadius="md"
          p={2}
          onDragOver={e => e.preventDefault()}
          // onDrop={handleDrop}
        >
          {sortedMessages.map(msg => (
            <MessageBubble key={msg.id} isMe={msg.userName !== 'Docusage'} message={msg} />
          ))}

          {/* Typing indicator */}
          {isWaiting && <TypingBubble />}
        </Box>

        {/* Input & Controls */}
        <VStack spacing={3} mt={4}>
          <InputGroup bg={inputBg} borderRadius="md">
            <Textarea
              value={input}
              placeholder="Type a message..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (isWaiting) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              resize="none"
              p={4}
              bg={inputBg}
              isDisabled={isWaiting}
            />
            <InputRightElement>
              <IconButton
                aria-label="send"
                icon={<MdSend />}
                onClick={sendMessage}
                isDisabled={isWaiting}
              />
            </InputRightElement>
          </InputGroup>

          <HStack spacing={4} w="100%" justify="center">
            <Tooltip label="Reset Chat">
              <IconButton
                fontSize={31}
                aria-label="reset"
                icon={<MdChangeCircle />}
                onClick={resetChat}
              />
            </Tooltip>
            <Tooltip label="Show uploaded apps">
              <IconButton
                fontSize={30}
                aria-label="panel"
                icon={isPanelOpen ? <LuPanelTopClose /> : <LuPanelTopOpen />}
                onClick={togglePanel}
              />
            </Tooltip>
            <Tooltip label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
              <IconButton
                fontSize={30}
                aria-label="toggle-color-mode"
                icon={colorMode === 'light' ? <MdDarkMode /> : <MdLightMode />}
                onClick={toggleColorMode}
              />
            </Tooltip>
            <Tooltip label="Download Chat History">
              <IconButton
                fontSize={30}
                aria-label="download"
                icon={<MdFileDownload />}
                onClick={() => {
                  const content = sortedMessages
                    .map(
                      m =>
                        `${format(new Date(m.creationDate), 'yyyy-MM-dd HH:mm:ss')} ${m.userName}> ${m.payload}`
                    )
                    .join('\n');
                  const url =
                    'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
                  downloadFile(url, `sage-${format(new Date(), 'yyyy-MM-dd-HH:mm:ss')}.txt`);
                }}
              />
            </Tooltip>
          </HStack>
        </VStack>

        {/* Uploaded Apps Panel */}
        <Collapse in={isPanelOpen} animateOpacity>
          {/* … unchanged panel JSX … */}
        </Collapse>

        <Box bg={useColorModeValue('blackAlpha.100','gray.700')} p={2} mt={4} borderRadius="sm">
          <Text textAlign="center" fontSize="xs" color={useColorModeValue('gray.600','gray.300')}>
            AI can make mistakes. User caution is advised.
          </Text>
        </Box>
      </Flex>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element { return <></>; }
const GroupedToolbarComponent = (): JSX.Element => <></>;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
