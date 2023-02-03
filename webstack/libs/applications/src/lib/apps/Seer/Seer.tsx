/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useUser } from '@sage3/frontend';
import {
  Alert, AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
  IconButton, Image, Input,
  Spinner, Text,
  Textarea, Toast,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState, fieldT } from './index';
import { AppWindow } from '../../components';


// Styling
import './styling.css';
import { MdClearAll, MdPlayArrow } from "react-icons/md";
import { useEffect, useRef, useState } from "react";

// import AceEditor from "react-ace";
import { v4 as getUUID } from "uuid";
import { User } from "@sage3/shared/types";
import Ansi from "ansi-to-react";

/* App component for Seer */
const MARGIN = 2;

function AppComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const [code, setCode] = useState<string>(s.code);
  const [fieldType, setFieldType] = useState<fieldT>(s.fieldType);



  return (
    <AppWindow app={props}>
      <Box
        id="sc-container"
        w={'100%'}
        h={'100%'}
        bg={bgColor}
        overflowY={'scroll'}
        css={{
          '&::-webkit-scrollbar': {
            width: '.1em',
          },
          '&::-webkit-scrollbar-track': {
            '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'teal',
            outline: '2px solid teal',
          },
        }}
      >
        <InputBox app={props}
          fieldType={fieldType}
          setFieldType={setFieldType} />


        {
          !s.output ?
            null :
            <OutputBox output={s.output} app={props} fieldType={fieldType} />
        }
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Seer */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      {/*NTS: Ask how to add a space in the ToolbarComponent between the label*/}
      {/*and the actual buttons. Michael did this in SageCell.*/}
      <div style={{ marginTop: '4px' }}>
        <Button colorScheme="green" disabled={true}> <MdPlayArrow size={'1.5em'} color='#808080'></MdPlayArrow> Execute</Button>
      </div>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

type InputBoxProps = {
  app: App;
  fieldType: fieldT;
  setFieldType: (newVal: fieldT) => void;
};


const InputBox = (props: InputBoxProps): JSX.Element => {

  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();
  const [fontSize, setFontSize] = useState(s.fontSize);
  const toast = useToast();
  const fieldType = props.fieldType;

  const handleExecute = () => {
    console.log("handling execute and code is: " + code)
    if (code) {
      console.log("Executing the code")
      updateState(props.app._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { _uuid: getUUID() } },
      });
    }
  };

  const handleClear = () => {
    console.log("Clear was pressed, current value for code is: " + code)
    updateState(props.app._id, {
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
    setCode("")
    console.log("New value aftere clearn is: " + code)
  };


  const updateCode = (e: any) => {
    console.log("code updated");
    setCode(e.target.value);
    if (e.target.value.length > 4) {
      console.log("flipping the property");
      props.setFieldType("text");
    }
    else {
      console.log("flipping the property");
      props.setFieldType("code");
    }
    console.log(code)
  };


  return (
    <Box>
      <HStack>
        <Textarea
          ml={MARGIN}
          mt={MARGIN}
          value={code}
          onChange={updateCode}
          placeholder='Add your code here'
          size='lg'
        />

        <VStack pr={MARGIN} pt={MARGIN}>

          <Tooltip hasArrow label="Execute" placement="right-start">

            <IconButton
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
              onClick={handleExecute}
              aria-label={''}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              variant="ghost"
              icon={
                s.executeInfo?.executeFunc === 'execute' ? (
                  <Spinner size="sm" color="teal.500" />
                ) : (
                  <MdPlayArrow size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />
                )
              }
            />
          </Tooltip>

          <Tooltip hasArrow label="Clear All" placement="right-start">
            <IconButton
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
              onClick={handleClear}
              aria-label={''}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              variant="ghost"
              icon={<MdClearAll size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
        </VStack>

      </HStack>
      <div style={{ border: "1px solid black" }}>
        <p>CODE IS: {code}</p>
        <p>FIELD TYPE IS: {fieldType}</p>
      </div>


    </Box>
  );
}

type OutputBoxProps = {
  output: string;
  app: App;
  fieldType: fieldT
};

const OutputBox = (props: OutputBoxProps): JSX.Element => {
  // const s = props.app.data.state as AppState;
  // const parsedJSON = JSON.parse(props.output);
  // const fieldType = props.fieldType;
  // // parsedJSON["stream"]["text"]
  // return(
  //   <div>
  //     <div>FieldType is: {fieldType}</div>
  //     <div>Received output is: {s.output}</div>
  //
  //   </div>
  // );

  const parsedJSON = JSON.parse(props.output);
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  if (!props.output) return <></>;
  if (typeof props.output === 'object' && Object.keys(props.output).length === 0) return <></>;
  return (
    <Box
      p={MARGIN}
      m={MARGIN}
      hidden={!parsedJSON ? true : false}
      className="sc-output"
      style={{
        overflow: 'auto',
        backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
        boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: s.fontSize + 'px',
        color: useColorModeValue('#000000', '#FFFFFF'),
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {!parsedJSON.execute_result || !parsedJSON.execute_result.execution_count ? null : (
        <Text
          fontSize="xs"
          color="gray.500"
          style={{
            fontFamily: 'monospace',
          }}
        >
          {`Out [${parsedJSON.execute_result.execution_count}]`}
        </Text>
      )}
      {parsedJSON.request_id ? null : null}
      {!parsedJSON.error ? null : !Array.isArray(parsedJSON.error) ? (
        <Alert status="error">{`${parsedJSON.error.ename}: ${parsedJSON.error.evalue}`}</Alert>
      ) : (
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Ansi>{parsedJSON.error[parsedJSON.error.length - 1]}</Ansi>
        </Alert>
      )}

      {!parsedJSON.stream ? null : parsedJSON.stream.name === 'stdout' ? (
        <Text id="sc-stdout">{parsedJSON.stream.text}</Text>
      ) : (
        <Text id="sc-stderr" color="red">
          {parsedJSON.stream.text}
        </Text>
      )}

      {!parsedJSON.display_data
        ? null
        : Object.keys(parsedJSON.display_data).map((key) => {
          if (key === 'data') {
            return Object.keys(parsedJSON.display_data.data).map((key, i) => {
              switch (key) {
                case 'text/plain':
                  return (
                    <Text key={i} id="sc-stdout">
                      {parsedJSON.display_data.data[key]}
                    </Text>
                  );
                case 'text/html':
                  return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.display_data.data[key] }} />;
                case 'image/png':
                  return <Image key={i} src={`data:image/png;base64,${parsedJSON.display_data.data[key]}`} />;
                case 'image/jpeg':
                  return <Image key={i} src={`data:image/jpeg;base64,${parsedJSON.display_data.data[key]}`} />;
                case 'image/svg+xml':
                  return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.display_data.data[key] }} />;
                default:
                  return MapJSONObject(parsedJSON.display_data[key]);
              }
            });
          }
          return null;
        })}

      {!parsedJSON.execute_result
        ? null
        : Object.keys(parsedJSON.execute_result).map((key) => {
          if (key === 'data') {
            return Object.keys(parsedJSON.execute_result.data).map((key, i) => {
              switch (key) {
                case 'text/plain':
                  if (parsedJSON.execute_result.data['text/html']) return null; // don't show plain text if there is html
                  return (
                    <Text key={i} id="sc-stdout">
                      {parsedJSON.execute_result.data[key]}
                    </Text>
                  );
                case 'text/html':
                  return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.execute_result.data[key] }} />;
                case 'image/png':
                  return <Image key={i} src={`data:image/png;base64,${parsedJSON.execute_result.data[key]}`} />;
                case 'image/jpeg':
                  return <Image key={i} src={`data:image/jpeg;base64,${parsedJSON.execute_result.data[key]}`} />;
                case 'image/svg+xml':
                  return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.execute_result.data[key] }} />;
                default:
                  return null;
              }
            });
          }
          return null;
        })}
    </Box>
  );
};

const MapJSONObject = (obj: any): JSX.Element => {
  if (!obj) return <></>;
  if (typeof obj === 'object' && Object.keys(obj).length === 0) return <></>;
  return (
    <Box
      pl={2}
      ml={2}
      bg={useColorModeValue('#FFFFFF', '#000000')}
      boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
      rounded={'md'}
      fontSize={'16px'}
      color={useColorModeValue('#000000', '#FFFFFF')}
    >
      {typeof obj === 'object'
        ? Object.keys(obj).map((key) => {
          if (typeof obj[key] === 'object') {
            return (
              <Box key={key}>
                <Box as="span" fontWeight="bold">
                  {key}:
                </Box>
                <Box as="span" ml={2}>
                  {MapJSONObject(obj[key])}
                </Box>
              </Box>
            );
          } else {
            return (
              <Box key={key}>
                <Box as="span" fontWeight="bold">
                  {key}:
                </Box>
                <Box as="span" ml={2}>
                  {obj[key]}
                </Box>
              </Box>
            );
          }
        })
        : null}
    </Box>
  );
};

