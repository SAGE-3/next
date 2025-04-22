import { useMemo, useRef, useState, Fragment, useEffect } from 'react';
import { useParams } from 'react-router';
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
// Using React Icons for mode toggle and panel icons
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

// Main App component
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
  const chatRef = useRef<HTMLDivElement>(null);

  const updateState = useAppStore((st) => st.updateState);
  const apps = useAppStore((st) => st.apps);
  const selectedApps = useUIStore((st) => st.selectedAppsIds);

  // Sync messages
  useEffect(() => {
    setSortedMessages([...s.messages].sort((a, b) => a.creationDate - b.creationDate));
  }, [s.messages]);
  // Sync uploaded list
  useEffect(() => {
    setUploaded(s.uploaded || []);
  }, [s.uploaded]);
  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [sortedMessages]);
    // Collision-based upload: add apps overlapping this chat window
  const checkOverlap = (app1: App, app2: App): boolean => {
    const rect1 = {
      x: app1.data.position.x,
      y: app1.data.position.y,
      width: app1.data.size.width,
      height: app1.data.size.height,
    };
    const rect2 = {
      x: app2.data.position.x,
      y: app2.data.position.y,
      width: app2.data.size.width,
      height: app2.data.size.height,
    };
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  useEffect(() => {
    const myApp = apps.find(a => a._id === props._id);
    if (!myApp) return;
    const newUploads: UploadedItem[] = [];
    apps.forEach(other => {
      if (other._id === props._id) return;
      if (checkOverlap(myApp, other)) {
        const already = uploaded.find(u => u.id === other._id);
        if (!already) {
          newUploads.push({
            id: other._id,
            title: other.data.title,
            type: other.data.type,
            uploadDate: Date.now(),
            uploadedBy: user?.data.name || 'unknown',
          });
        }
      }
    });
    if (newUploads.length > 0) {
      const updated = [...uploaded, ...newUploads];
      setUploaded(updated);
      updateState(props._id, { ...s, uploaded: updated });
    }
  }, [apps, isPanelOpen]);

  const showToast = (title: string, desc: string, status: any) =>
    toast({ title, description: desc, status, duration: 3000, isClosable: true });

  const sendMessage = async (): Promise<void> => {
    const text = input.trim();
    if (!text) {
      showToast('Error', 'Please enter a message', 'error');
      return;
    }
    const now = await serverTime();
    const userMsg = {
      id: genId(), userId: user?._id || '',
      creationDate: now.epoch, payload: text,
      userName: user?.data.name || '', type: 'query',
    };
    updateState(props._id, { ...s, messages: [...s.messages, userMsg] });
    setInput('');
    try {
      const res = await fetch('http://localhost:5050/chat-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, boardId, appId: props._id, message: userMsg }),
      });
      const data = await res.json();
      const botMsg = {
        id: genId(), userId: '', creationDate: Date.now(),
        payload: data.response, userName: 'Docusage', type: data.type, source: data.source,
      };
      updateState(props._id, { ...s, messages: [...s.messages, userMsg, botMsg] });
    } catch {
      showToast('Error', 'Failed to send message', 'error');
    }
  };

  const resetChat = () =>
    updateState(props._id, { ...s, messages: initialState.messages, uploaded: [] });
    const togglePanel = () => setPanelOpen(!isPanelOpen);

  // Handle drag-and-drop uploads onto chat window
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('app_state');
    if (!data) return;
    try {
      const stateObj = JSON.parse(data);
      // Assume first source is the app ID
      const appId = stateObj.sources?.[0];
      const droppedApp = apps.find(a => a._id === appId);
      if (!droppedApp) return;
      const newItem: UploadedItem = {
        id: droppedApp._id,
        title: droppedApp.data.title,
        type: droppedApp.data.type,
        uploadDate: Date.now(),
        uploadedBy: user?.data.name || 'unknown',
      };
      if (!uploaded.some(u => u.id === newItem.id)) {
        setUploaded(prev => {
          const updated = [...prev, newItem];
          updateState(props._id, { ...s, uploaded: updated });
          return updated;
        });
      }
    } catch {
      // invalid JSON
    }
  };

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
          onDrop={handleDrop}
          minH={'150px'}
        >
          {sortedMessages.map(msg => (
            <MessageBubble key={msg.id} isMe={msg.userName !== 'Docusage'} message={msg} />
          ))}
        </Box>
        {/* Input & Controls */}
        <VStack spacing={3} mt={4}>
          <InputGroup bg={inputBg} borderRadius="md">
            <Textarea
              value={input} placeholder="Type a message..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              resize="none" p={4} bg={inputBg}
            />
            <InputRightElement>
              <IconButton aria-label="send" icon={<MdSend />} onClick={sendMessage} />
            </InputRightElement>
          </InputGroup>

          <HStack spacing={4} w="100%" justify="center">
            <Tooltip label="Reset Chat"><IconButton fontSize={31} aria-label="reset" icon={<MdChangeCircle />} onClick={resetChat} /></Tooltip>
            <Tooltip label="Show uplaoded apps"><IconButton fontSize={30} aria-label="panel" icon={isPanelOpen ? <LuPanelTopClose /> : <LuPanelTopOpen />} onClick={togglePanel} /></Tooltip>
            <Tooltip label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
              <IconButton fontSize={30} aria-label="toggle-color-mode" icon={colorMode === 'light' ? <MdDarkMode /> : <MdLightMode />} onClick={toggleColorMode} />
            </Tooltip>
            <Tooltip label="Download Chat History">
              <IconButton
                fontSize={30}
                aria-label="download"
                icon={<MdFileDownload />}
                onClick={() => {
                  const content = sortedMessages
  .map(m => `${format(new Date(m.creationDate), 'yyyy-MM-dd HH:mm:ss')} ${m.userName}> ${m.payload}`)
  .join('\n');
                  const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
                  downloadFile(url, `sage-${format(new Date(), 'yyyy-MM-dd-HH:mm:ss')}.txt`);
                }}
              />
            </Tooltip>
          </HStack>
        </VStack>
        {/* Uploaded Apps Panel */}
        <Collapse in={isPanelOpen} animateOpacity>
          <Box bg={useColorModeValue('gray.100', 'gray.600')} p={4} mt={4} borderRadius="md" maxH="300px" minH="150px" overflowY="auto">
            <Text fontSize="lg" mb={2}>Uploaded Apps ({uploaded.length})</Text>
            <Text fontSize="sm" mb={2}>Drag an app into chat. Click to append its ID.</Text>
            <Box>
              <ol>
                {uploaded.map(item => (
                  <li key={item.id}>
                    <HStack justify="space-between" p={2} _hover={{ bg: useColorModeValue('gray.200','gray.500') }} borderRadius="md">
                      <Text>{item.title} <Text as="span" fontSize="xs" color="gray.500">({item.id.slice(0,8)})</Text></Text>
                      <IconButton aria-label="delete" icon={<MdDelete />} size="sm" onClick={() => {
                        const nl = uploaded.filter(u => u.id !== item.id);
                        setUploaded(nl);
                        updateState(props._id, { ...s, uploaded: nl });
                      }} />
                    </HStack>
                  </li>
                ))}
              </ol>
            </Box>
          </Box>
        </Collapse>
        <Box bg={useColorModeValue('blackAlpha.100','gray.700')} p={2} mt={4} borderRadius="sm">
          <Text textAlign="center" fontSize="xs" color={useColorModeValue('gray.600','gray.300')}
          >AI can make mistakes. User caution is advised.</Text>
        </Box>
      </Flex>
    </AppWindow>
  );
}

// Dummy toolbars (handled within AppComponent)
function ToolbarComponent(props: App): JSX.Element { return <></>; }
const GroupedToolbarComponent = (): JSX.Element => <></>;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };















// /**
//  * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
//  * University of Hawaii, University of Illinois Chicago, Virginia Tech
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  */

// import { useMemo, useRef, useState, Fragment, useEffect } from 'react';
// import { useParams } from 'react-router';
// import {
//   ButtonGroup,
//   Button,
//   useToast,
//   IconButton,
//   Box,
//   Text,
//   Flex,
//   useColorModeValue,
//   Tooltip,
//   InputGroup,
//   InputRightElement,
//   HStack,
//   Textarea,
//   Collapse,
//   Icon,
// } from '@chakra-ui/react';
// import { 
//   MdSend, 
//   MdChangeCircle, 
//   MdFileDownload, 
//   MdChat,  
//   MdOutlineArrowOutward,
//   MdStickyNote2,
//   MdImage,
//   MdPictureAsPdf,
//   MdQuestionMark,
//   MdContentCopy,
//   MdCheckCircle,
//   MdOutlineRefresh,
//   MdDelete,
// } from 'react-icons/md';

// import { format } from 'date-fns/format';
// import DOMPurify from 'dompurify';

// import {
//   useAppStore,
//   useHexColor,
//   useUser,
//   serverTime,
//   downloadFile,
//   useUsersStore,
//   useUIStore,
// } from '@sage3/frontend';
// import { genId } from '@sage3/shared';

// import { App } from '../../schema';
// import { state as AppState, init as initialState } from './index';
// import { AppWindow } from '../../components';

// // Interfaces
// interface MessagePropstxt {
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

// /* App component for Chat */

// function AppComponent(props: App): JSX.Element {
//   const s = props.data.state as AppState;
//   const { roomId, boardId } = useParams();

//   const { user } = useUser();
//   const [username, setUsername] = useState('');

//   // Colors for Dark theme and light theme
//   const myColor = useHexColor(user?.data.color || 'blue');
//   const sageColor = useHexColor('purple');
//   // const aiTypingColor = useHexColor('orange');
//   const bgColor = useColorModeValue('gray.200', 'gray.800');
//   const fgColor = useColorModeValue('gray.800', 'gray.200');
//   const sc = useColorModeValue('gray.400', 'gray.200');
//   // const scrollColor = useHexColor(sc);
//   const textColor = useColorModeValue('gray.700', 'gray.100');
//   // App state management
//   const updateState = useAppStore((state) => state.updateState);
//   const apps = useAppStore((state) => state.apps);

//   // Get presences of users
//   // const users = useUsersStore((state) => state.users);
  
//   // Input text for query
//   const [input, setInput] = useState<string>('');
//   // Element to set the focus to when opening the dialog
//   const inputRef = useRef<HTMLTextAreaElement>(null);
//   // Processing
//   const [scrolled, setScrolled] = useState(false);
//   const [newMessages, setNewMessages] = useState(false);

//   const [status] = useState<string>('AI can make mistakes. Check important information.');
//   // const [location, setLocation] = useState('');

//   const [uploaded, setUploaded] = useState<UploadedItem[]>([]);
//   const [isPanelOpen, setIsPanelOpen] = useState(false);
//   // const [sortedMessages, setSortedMessages] = useState([]);


//   const isSelected = useUIStore.getState().selectedAppId === props._id;
//   const chatBox = useRef<null | HTMLDivElement>(null);
  
//   // Display some notifications
//   const toast = useToast();
//   const [sortedMessages, setSortedMessages] = useState<MessagePropstxt['message'][] | []>([]);

//   const [serverResponse, setServerResponse] = useState<MessagePropstxt['message'] | null>(null);
  
//   // const [database, setDatabase] = useState<{ files: string[] }>({ files: [] });
//   // const isInitialRender = useRef(true);
//   // const isStateSync = useRef(false);
//   // const isSetSync = useRef(false);

//   const selectedAppsList = useUIStore.getState().selectedAppsIds;
//   const previousPositionsRef = useRef(new Map()); 
//   // // Sort messages by creation date to display in order
//   useEffect(() => {
//     setSortedMessages(s.messages ? [...s.messages].sort((a, b) => a.creationDate - b.creationDate) : []);
//   }, [s.messages]);

//   useEffect(() =>{
//     if (serverResponse !== null) {
//       updateState(props._id, {
//         ...s,
//         messages: [...s.messages, serverResponse], 
//       }); 
//     }
//   }, [serverResponse]);

//   // useEffect(() =>{
//   //   updateState(props._id, {
//   //     ...s,
//   //     uploaded: [...new Set([...s.uploaded, ...uploaded])], 
//   //   }); 
//   // }, [uploaded.length]);

//   useEffect(() => {
//     // Update local state when s.uploaded changes externally
//     if (s.uploaded) {
//       setUploaded(s.uploaded);
//     }
//   }, [s.uploaded]);


// //   useEffect(() => {
// //     console.log('State:', s.uploaded);
// //     console.log('Local:', uploaded);
// //     // Skip initial render or when update is from state sync
// //     if (isInitialRender.current || isStateSync.current) {
// //         isInitialRender.current = false;
// //         return;
// //     }
    
// //     updateState(props._id, {
// //         ...s,
// //         uploaded: [...new Set([...Array.from(uploaded)])],
// //     });
// // }, [uploaded.size]);

// // useEffect(() => {
// //   console.log('State:', s.uploaded);
// //   console.log('Local:', uploaded);
// //     // Skip initial render or when update is from Set sync
// //     if (isInitialRender.current || isSetSync.current) {
// //         isInitialRender.current = false;
// //         return;
// //     }

// //     const titles = s.uploaded
// //         ?.filter(item => item?.title)
// //         .map(item => item.title) || [];
// //     setUploaded(new Set(titles));
// // }, [s.uploaded.length]);



//   const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     const value = e.target.value;
//     setInput(value);
//   };


//   // const addUploadedItem = (newItem: UploadedItem) => {
//   //   setUploaded((prev) => {
//   //     // Check for uniqueness by title
//   //     if (prev.some(item => item.title === newItem.title)) {
//   //       return prev;
//   //     }
//   //     return [...prev, newItem];
//   //   });
//   // };


//   const showToast = (title: string, description: string, status: 'info' | 'warning' | 'error' | 'success') => {
//     toast({
//       title: title,
//       description: description,
//       status: status,
//       duration: 4000,
//       isClosable: true,
//     });
//   }

//   const sendMessage = async () => {
//     const text = input.trim();
//     setInput('');
//     if (!text) {
//       showToast('Error', 'Please enter a message.', 'error');
//       return;
//     }
//     await newMessage(text);
//   };

//   const onSubmit = (e: React.KeyboardEvent) => {
//     // Keyboard instead of pressing the button
//     if (e.key === 'Enter') {
//       if (e.shiftKey) {
//         // Shift + Enter
//         e.preventDefault();
//         setInput(input + '\n');
//       } else {
//         e.preventDefault();
//         sendMessage();
//       }
//     }
//   };

//   const togglePanel = () => {
//     setIsPanelOpen(!isPanelOpen);
//   };

//   useEffect(() => {
//     if (inputRef.current && isSelected) {
//       inputRef.current.focus();
//     }
//   }, [inputRef, isSelected]);

//   useEffect(() => {
//     if (user) {
//       // User name
//       const u = user.data.name;
//       const firstName = u.split(' ')[0];
//       setUsername(firstName);
//     }
//   }, [user]);
 

//   const goToBottom = (mode: ScrollBehavior = 'smooth') => {
//     // Scroll to bottom of chat box smoothly
//     chatBox.current?.scrollTo({
//       top: chatBox.current?.scrollHeight,
//       behavior: mode,
//     });
//   };

//   const scrollToMessage = (messageId: string, mode: ScrollBehavior = 'smooth') => {
//     if (!messageId) return; // Ignore invalid IDs
  
//     // Locate the message's Box element by its unique ID
//     const messageElement = chatBox.current?.querySelector(`#message-${messageId}`);
  
//     if (messageElement && chatBox.current) {
//       // Get the vertical offset of the message
//       const offsetTop = (messageElement as HTMLElement).offsetTop;
  
//       // Scroll the chat box to the message's position
//       chatBox.current.scrollTo({
//         top: offsetTop,
//         behavior: mode,
//       });
//     }
//     setScrolled(true);
//   };
  
  
//   const renderMessage = (message:  MessagePropstxt['message']) => {
//     const sanitizedHTML = DOMPurify.sanitize(message.payload);
//       return (
//         <div
//           dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
//           style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
//         />
//       );
//   };

//   // Reset the chat: clear previous question and answer, and all the messages
//   const resetSAGE = () => {
//     updateState(props._id, { ...s, uploaded: [], messages: initialState.messages });
//     setUploaded([]);
//     setInput('');
//   };

//   const checkOverlap = (app1: App, app2: App) => {
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

//     // Check for overlap
//     if(isPanelOpen){
//       rect1.width = rect1.width + 450;

//       return (
//         rect1.x < rect2.x + rect2.width &&
//         rect1.x + rect1.width > rect2.x &&
//         rect1.y < rect2.y + rect2.height &&
//         rect1.height + rect1.y > rect2.y
//       );
//     } 
//     return (
//       rect1.x < rect2.x + rect2.width &&
//       rect1.x + rect1.width > rect2.x &&
//       rect1.y < rect2.y + rect2.height &&
//       rect1.height + rect1.y > rect2.y
//     );
    
    
//   };

//   const handleAddUploaded = (newItem: UploadedItem) => {
//     // Only add if there isn’t already an item with the same id
//     if (uploaded.some((item) => item.id === newItem.id)) {
//       return;
//     }
//     const updatedList = [...uploaded, newItem];
//     setUploaded(updatedList);
//     updateState(props._id, { ...s, uploaded: updatedList }); // Sync with external state
//   };

//   useEffect(() => {
//     const myApp = apps.find((app) => app._id === props._id);
//     if (!myApp) return;
//     if (selectedAppsList.includes(props._id)) return;
  
//     apps.forEach((otherApp) => {
//       if (otherApp._id !== myApp._id && checkOverlap(myApp, otherApp)) {
//         // Build an uploaded item for the overlapping app
//         const newItem = {
//           id: otherApp._id,
//           title: otherApp.data.title,
//           type: otherApp.data.type,
//           uploadDate: Date.now(), // or use a serverTime call if needed
//           // uploadedBy: otherApp.data.userName || 'unknown',
//           uploadedBy: 'unknown',
//         };
  
//         // If the overlapping app is also in the selected apps list, add each one
//         if (selectedAppsList.includes(otherApp._id)) {
//           // For each app ID in the selected list, find its corresponding app data
//           selectedAppsList.forEach((id) => {
//             const selectedApp = apps.find((app) => app._id === id);
//             if (selectedApp) {
//               const selectedItem = {
//                 id: selectedApp._id,
//                 title: selectedApp.data.title,
//                 type: selectedApp.data.type,
//                 uploadDate: Date.now(),
//                 // uploadedBy: selectedApp.data.uploadedBy || 'unknown',
//                 uploadedBy: 'unknown',
//               };
//               handleAddUploaded(selectedItem);
//             }
//           });
//         } else {
//           // Otherwise, add just the single new item
//           handleAddUploaded(newItem);
//         }
//       }
//     });
//   }, [apps]);
  

//   // Wait for new messages to scroll to the bottom
//   // This will scroll to the bottom of the chat box when new messages are added
//   useEffect(() => {
//     if (!scrolled) {
//       // Scroll to bottom of chat box smoothly
//       goToBottom();
//     }
//     if (scrolled) setNewMessages(true);
//   }, [s.messages]);

//   // Components
//   const TextBubble: React.FC<MessagePropstxt> = ({ isMe, message }) => {
//     return(
      
//         <Tooltip
//           whiteSpace={'nowrap'}
//           textOverflow="ellipsis"
//           fontSize={'xs'}
//           placement="top"
//           hasArrow={true}
//           label={getDateString(message.creationDate)}
//           openDelay={250}
//           closeDelay={0}
//         >
//           <Box
//             color="black"
//             rounded={'md'}
//             boxShadow="md"
//             fontFamily="arial"
//             textAlign={isMe ? 'right' : 'left'}
//             bg={isMe ? myColor : sageColor}
//             px={2}
//             py={1}
//             m={3}
//             maxWidth="85%"
//             userSelect={'none'}
//             draggable={true}
//             // Store the query into the drag/drop events to create stickies
//             onDragStart={dragEventHandler(message.payload, isMe ? myColor : sageColor)}
//             css={{
//               whiteSpace: 'pre-wrap', // Ensures line breaks (\n) are rendered correctly
//             }}
//             onClick={() => scrollToMessage(message.source || "", 'smooth')}
//           >
//             {message.userName==='Docusage' ? renderMessage(message) : message.payload}
//           </Box>
//         </Tooltip>
//     )
//   };

//   const checkDB = (filename: string): boolean => {
//     return true;
//   };
//   const handleDelete = (itemId: string) => {
//     const updatedList = uploaded.filter((u) => u.id !== itemId);
//     setUploaded(updatedList);
//     updateState(props._id, { ...s, uploaded: updatedList }); // Sync with external state
//   };
  
//   const Collapsable = () => {
//     const handleItemClick = (appId: string) => {
//       // Append the ID to the existing input with a space separator
//       setInput((prevInput) => {
//         const trimmedPrevInput = prevInput.trim();
//         return trimmedPrevInput ? `${trimmedPrevInput} ${appId.split('-')[0]}... ` : `${appId.split('-')[0]}... `;
//       });
//     };
  
//     return (
//       <Collapse in={isPanelOpen} animateOpacity>
//         <Box
//           bg={bgColor}
//           p={4}
//           position="absolute"
//           left="100%"
//           top={0}
//           w="450px"
//           h="100%"
//           shadow="lg"
//           border={"4px"}
//           borderColor="#8d8b8f"
//           zIndex={2}
//           overflow=""
//           overflowY="auto"
//           css={{
//             '&::-webkit-scrollbar': {
//               width: '8px',
//             },
//             '&::-webkit-scrollbar-track': {
//               background: '#f1f1f1',
//             },
//             '&::-webkit-scrollbar-thumb': {
//               background: '#888',
//               borderRadius: '4px',
//             },
//             '&::-webkit-scrollbar-thumb:hover': {
//               background: '#555',
//             },
//           }}
//         >
//           <Text fontSize="lg" fontWeight="bold" mb={1}>
//             Apps uploaded in Chat
//             ({uploaded.length})
//           </Text>
//           <Text fontSize="sm" mb={4}>
//             Drag and drop an app on the Chat window to upload.
//             Click on any item to add its ID to the chat input.
//           </Text>
//           <Box borderBottom="1px solid" borderColor="gray.300" mb={4} />
//           <Box ml={3}>
//             <ol>
//               {uploaded.map((item) => {
//               return (
//                 <li key={item.id}>
//                   <Box
//                     cursor="pointer"
//                     _hover={{ bg: 'gray.100' }}
//                     p={2}
//                     borderRadius="md"
//                     marginBottom={3}
//                   >
//                     <Text fontWeight="bold">
//                       {checkDB(item.id) && <Icon as={MdCheckCircle} color="green.500" boxSize={4} mr={2} />}
//                       <Box as="span" mr={2}
//                       onClick={() => handleItemClick(item.id)}
//                       >
//                         <strong>{`${item.id.substring(0, 25)}...`}</strong>
//                       </Box>
//                       <Button
//                         position="absolute"
//                         right={5}
//                         colorScheme="red"
//                         size="md"
//                         name={item.title}
//                         onClick={(e) => handleDelete(item.id)}
//                       >
//                         Delete
//                       </Button>
//                     </Text>
//                   </Box>
//                 </li>
//               );
//             })}

//               {/* {[...uploaded]
//                 .map((key) => {
//                   const app = apps.find((app) => app._id === key);
  
//                   if (!app) {
//                     setUploaded((prevSet) => {
//                       const newSet = new Set(prevSet);
//                       newSet.delete(key);
//                       return newSet;
//                     });
//                     return null;
//                   }
  
//                   const getIcon = (type: string) => {
//                     switch (type) {
//                       case 'Chat':
//                         return MdChat;
//                       case 'Stickie':
//                         return MdStickyNote2;
//                       case 'ImageViewer':
//                         return MdImage;
//                       case 'PDFViewer':
//                         return MdPictureAsPdf;
//                       default:
//                         return MdQuestionMark;
//                     }
//                   };
  
//                   return (
//                     <li key={key}>
//                       <Box 
//                         cursor="pointer" 
//                         onClick={() => handleItemClick(app._id)}
//                         _hover={{ bg: 'gray.100' }}
//                         p={2}
//                         borderRadius="md"
//                       >
//                         <Text fontWeight="bold">
//                           <Icon as={getIcon(app.data.type)} />
//                           {app.data.title}
//                           {checkDB(app.data.title) && <Icon as={MdCheckCircle} color="green.500" boxSize={4} />}
//                         </Text>
  
//                         <Box ml={4} pl={2} borderLeft="1px solid gray">
//                           <Text>
//                             <strong>Type:</strong> {app.data.type}
//                           </Text>
//                           <Text>
//                             <strong>ID:</strong> {app._id}
//                           </Text>
//                           <Box mt={2}>
//                             <Button
//                               colorScheme="red"
//                               size="sm"
//                               name={app._id}
//                               onClick={(e) => {
//                                 e.stopPropagation(); // Prevent triggering the parent click
//                                 handleDelete(e);
//                               }}
//                             >
//                               Delete
//                             </Button>
//                           </Box>
//                         </Box>
//                         <Box mb={8} />
//                       </Box>
//                     </li>
//                   );
//                 })} */}
//             </ol>
//           </Box>
//         </Box>
//       </Collapse>
//     );
//   };

//   // Event handlers
//   const dragEventHandler = (text: string, color: string) => {
//     return function handleDragEvent(e: any) {
//       // Clear existing data
//       e.dataTransfer.clearData();
      
//       // Set app type
//       e.dataTransfer.setData('app', 'Stickie');
      
//       // Set app state with sticky note configuration
//       e.dataTransfer.setData(
//         'app_state',
//         JSON.stringify({
//           color: color,
//           text: text,
//           fontSize: 24,
//           sources: [props._id],
//         })
//       );
//     };
//   };

//   // const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
//   //   const appId = event.currentTarget.name;
//   //   uploaded.delete(appId);
    
//   // };
  
//   const handleCopy = (message: MessagePropstxt['message']) => {
//     if (navigator.clipboard) {
//       navigator.clipboard.writeText(message.payload)
//         .then(() => showToast('Success', 'Content Copied to Clipboard', 'success'))
//         .catch(() => showToast('Error', 'Failed to copy content', 'error'));
//     } else {
//       showToast('Error', 'Clipboard not supported', 'error');
//     }
//   };

//   const newMessage = async (new_input: string) => {
//     if (!user) return;
//     const now = await serverTime();
  
//     // Add the user's message to the state first
//     const userMessage = {
//       id: genId(),
//       userId: user._id,
//       creationDate: now.epoch,
//       userName: user?.data.name,
//       payload: new_input,
//       type: 'query',
//     };
     
//     updateState(props._id, {
//       ...s,
//       messages: [...s.messages, userMessage],
//     }); 

//     try {
//         const response = await fetch('http://localhost:5050/chat-message', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
          
//           body: JSON.stringify({
//             roomId: roomId,
//             boardId: boardId,
//             appId: '',
//             message: userMessage,
//           }),
//         }); 
  
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
  
//       const res = await response.json();
//       // Add the server's response as a new message

//       const serverMessage = {
//         id: genId(),
//         userId: '',
//         creationDate: now.epoch,
//         userName: "Docusage",
//         payload: res.response,
//         type: res.type,
//         source: res.source,
//       };      
//     setServerResponse(serverMessage);      
//   } catch (error) {
//       console.error('Error sending message to server:', error);
//       showToast('Error', 'Failed to send message to the server.', 'error');
//     }
//   };
  
//   return (
//     <AppWindow app={props} hideBackgroundIcon={MdChat}>
//       <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="100%" w="100%" border={'4px'} borderColor={'#8d8b8f'} borderRadius={'md'}>
//         {/* Display Messages */}
//         <Box
//           flex={1}
//           bg={'#dddcde'}
//           borderRadius={'md'}
//           overflowY="scroll"
//           ref={chatBox}
//           css={{
//             '&::-webkit-scrollbar': {
//               width: '12px',
//             },
//             '&::-webkit-scrollbar-track': {
//               '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
//             },
//             '&::-webkit-scrollbar-thumb': {
//               backgroundColor: `${bgColor}`,
//               borderRadius: '6px',
//               outline: `3px solid ${bgColor}`,
//             },
//           }}
//         >
//           {sortedMessages.map((message, index) => {
//             const referencedMessage = s.messages.find((msg) => msg.id === message.source);
//             const referencedUserName = referencedMessage?.userName || "unknown";
            
//             return (              
//               <Fragment key={index}>
//                 {/* Start of User Messages */}
//                 {message.userName !== "Docusage" && (
//                   <Box key={message.id} position="relative" id={`message-${message.id}`}>
//                     {/* Show username */}                    

//                     <Box position="relative" my={1} maxWidth={"100%"}>
//                       <Tooltip
//                         whiteSpace={'nowrap'}
//                         textOverflow="ellipsis"
//                         fontSize={'xs'}
//                         placement="top"
//                         hasArrow={true}
//                         label={"Click to Copy input text."}
//                         openDelay={250}
//                         closeDelay={0}
//                       > 
//                         <Box top="-15px" right={'15px'} position={'absolute'} textAlign={"right"}  onClick={() => handleCopy(message)} cursor={'pointer'}>
                          
//                           <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
//                             <IconButton
//                               aria-label="Copy Text"
//                               icon={<MdContentCopy />}
//                               size="xs"
//                               colorScheme="gray"
//                               variant="ghost"
//                               onClick={() => handleCopy(message)}
//                             />
//                             {message.userName}
//                           </Text>
//                         </Box>
//                       </Tooltip>
//                     </Box>
                    
//                     {/* Show Message */}
//                     <Box display={'flex'} justifyContent='right'>
//                       <TextBubble isMe={true} message={message} />
//                     </Box>
//                   </Box>
//                 )}
                
//                 {/* Start of SAGE Messages */}
//                 {message.userName === "Docusage" && message.source &&(
//                   <Box position="relative" my={1} maxWidth={'85%'} id="">
//                     <Tooltip
//                         whiteSpace={'nowrap'}
//                         textOverflow="ellipsis"
//                         fontSize={'xs'}
//                         placement="top"
//                         hasArrow={true}
//                         label={"Click to Copy Response."}
//                         openDelay={250}
//                         closeDelay={0}
//                       >
//                         <Box top="0" left={'15px'} position={'absolute'} textAlign={"right"}  onClick={() => handleCopy(message)} cursor={'pointer'}>
//                           <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md" >
//                             {message.userName} replied to {referencedUserName}
//                             <IconButton
//                               aria-label="Copy Text"
//                               icon={<MdContentCopy />}
//                               size="xs"
//                               colorScheme="gray"
//                               variant="ghost"
//                               onClick={() => handleCopy(message)}
//                             />
//                           </Text>
                          
//                         </Box>
//                     </Tooltip>
//                     <Box display={'flex'} justifyContent="left" position={'relative'} top={'15px'} mb={'15px'}>
//                       <TextBubble isMe={false} message={message} />
//                     </Box>
//                   </Box>
//                 )}      

//                 {message.userName === "Docusage" && !message.source &&(
//                   <Box position="relative" my={1} maxWidth={'85%'} id="">
//                     <Tooltip
//                         whiteSpace={'nowrap'}
//                         textOverflow="ellipsis"
//                         fontSize={'xs'}
//                         placement="top"
//                         hasArrow={true}
//                         label={"Click to Copy Response."}
//                         openDelay={250}
//                         closeDelay={0}
//                       >
//                         <Box top="0" left={'15px'} position={'absolute'} textAlign={"right"} onClick={() => handleCopy(message)} cursor={'pointer'}>
//                           <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
//                             {message.userName}
//                             <IconButton
//                               aria-label="Copy Text"
//                               icon={<MdContentCopy />}
//                               size="xs"
//                               colorScheme="gray"
//                               variant="ghost"
//                             />
//                           </Text>
//                         </Box>
//                       </Tooltip>
//                     <Box display={'flex'} justifyContent="left" position={'relative'} top={'15px'} mb={'15px'}>
//                       <TextBubble isMe={false} message={message} />
//                     </Box>
//                   </Box>
//                 )}                          
//               </Fragment>
//             );
//           })}

//         </Box>

//         {/* Input Textarea and send button */}
//         <InputGroup bg={'blackAlpha.100'} maxHeight={'120px'}>
//           <Textarea
//             placeholder={'Chat with Docusage...'}
//             size="md"
//             variant="outline"
//             _placeholder={{ color: 'inherit' }}
//             onChange={handleChange}
//             onKeyDown={onSubmit}
//             value={input}
//             ref={inputRef}
//             resize="none"
//             top="-5%"
//           />
//           <InputRightElement 
//           onClick={sendMessage} 
//           mr={3} 
//           border={'1px'} 
//           shadow={'md'}
//           height="90%">
//             <MdSend color="green.500" />
//           </InputRightElement>
//         </InputGroup>
        
//         {/* Reset Button */}
//         <HStack align={'center'} justify={'center'} p={1} m={0}>
//           <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Reset Chat'} openDelay={400}>
//             <IconButton
//               aria-label="reset"
//               size={'xs'}
//               p={0}
//               m={0}
//               colorScheme={'blue'}
//               variant="ghost"
//               icon={<MdChangeCircle size="32px" />}
//               onClick={resetSAGE}
//               width="25%"
//               height={'40px'}
//               border={'1px'}
//               shadow={'md'}
//             />
//           </Tooltip>
//           {/* create a separation */}
//           <Box width="0.5%" height={'40px'}></Box>
//           {/* Open Side Panel */}
//           <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'All uploaded apps'} openDelay={400}>
//             <IconButton
//               aria-label="togglePanel"
//               size={'xs'}
//               p={0}
//               m={0}
//               colorScheme={'blue'}
//               variant="ghost"
//               icon={<MdOutlineArrowOutward size="32px" />}
//               onClick={togglePanel}
//               width="25%"
//               height={'40px'}
//               border={'1px'}
//               shadow={'md'}
//             />
//           </Tooltip>
//         </HStack>
        
//         <Collapsable />
        
//         {/* Status text at the bottom */}
//         <Box bg={'blackAlpha.100'} rounded={'sm'} p={1} m={0}>
//           <Text width="100%" align="center" whiteSpace={'nowrap'} textOverflow="ellipsis" color={fgColor} fontSize="xs">
//             {status}
//           </Text>
//         </Box>
//       </Flex>
//     </AppWindow>
    
//   );
// }


// /* App toolbar component for the app Chat */
// function ToolbarComponent(props: App): JSX.Element {
//   const s = props.data.state as AppState;
//   const { user } = useUser();
//   // Sort messages by creation date to display in order
//   const sortedMessages = useMemo(() => 
//     s.messages ? [...s.messages].sort((a, b) => a.creationDate - b.creationDate) : [], 
//     [s.messages]
//   );

//   // Download the stickie as a text file
//   const downloadTxt = () => {
//     // Rebuid the content as text
//     let content = '';
//     sortedMessages.map((message) => {
//       content += `${message.userName}> ${message.payload} \n`;
//     });

//     // Current date
//     const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
//     // generate a URL containing the text of the note
//     const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
//     // Make a filename with date
//     const filename = 'sage-' + dt + '.txt';
//     // Go for download
//     downloadFile(txturl, filename);
//   };

//   return (
//     <>
//       <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
//         <Tooltip placement="top-start" hasArrow={true} label={'Download Transcript'} openDelay={400}>
//           <Button onClick={downloadTxt}>
//             <MdFileDownload />
//           </Button>
//         </Tooltip>
//       </ButtonGroup>
//     </>
//   );
// }

// function getDateString(epoch: number): string {
//   const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
//   const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   return `${date} - ${time}`;
// }

// /**
//  * Grouped App toolbar component, this component will display when a group of apps are selected
//  * @returns JSX.Element | null
//  */
// const GroupedToolbarComponent = () => {
//   return null;
// };

// export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };