/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import {
  Box, Button, HStack, useColorModeValue, Tooltip,
  ButtonGroup, Select, Badge,
} from '@chakra-ui/react';

import './components/styles.css';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';
import { MdFileDownload, MdAdd, MdRemove, MdArrowDropDown } from 'react-icons/md';

// SAGE3 imports
import { useAppStore } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';

// Rendering functions
// import { ProcessedOutput } from './render';
import { InputBox } from './components/InputBox';
import { OutputBox } from './components/OutputBox';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {

  const [output, setOutput] = useState({} as any);

  const s = props.data.state as AppState;

  useEffect(() => {
    if (s.output) {
      try {
        const parsed = JSON.parse(s.output);
        if (parsed) {
          // console.log(parsed);
          setOutput(parsed);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }, [s.output]);

  return (
    <AppWindow app={props}>
      <Box id="sc-container" w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} overflowY={'scroll'}>
        {InputBox(props)}
        {!output ? null :
        <>
          <Box
            p={4}
            m={4}
            className="sc-output"
            style={{
                height: '100%',
                overflowX: 'auto',
                backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
                boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: `${s.fontSize}rem`,
                color: useColorModeValue('#000000', '#FFFFFF'),
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
            }}
            >
            {OutputBox(output)}
          </Box>
        </>
        }
      </Box>
    </AppWindow>
  );
}

/**
 * UI toolbar for the SageCell application
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function ToolbarComponent(props: App): JSX.Element {
  // Access the global app state
  const s = props.data.state as AppState;
  // Update functions from the store
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const [selected, setSelected] = useState<string>();
  const [kernels, setKernels] = useState<string[]>([]);

  useEffect(() => {
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { owner_uuid: props.data.ownerId }
      }
    });
  }, []);

  // Update from the props
  useEffect(() => {
    s.kernel ? setSelected(s.kernel) : setSelected('Select kernel');
  }, [s.kernel]);

  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value) {
      // save local state
      setSelected(e.target.value);
      // updae the app
      updateState(props._id, { kernel: e.target.value });
      // update the app description
      update(props._id, { description: `SageCell> ${e.target.value.slice(0,8)}` });
    }
  }

  // Download the stickie as a text file
  const downloadPy = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = `${s.code}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'sagecell-' + dt + '.py';
    // Go for download
    downloadFile(txturl, filename);
  };


  return (
    <>
      <HStack>
        {/* check if the object is empty */}
        {s.kernels && Object.keys(s.kernels).length === 0 && selected ? (
          // show a red light if the kernel is not running
          <Badge colorScheme="red" rounded="sm" size="lg">
            Offline
          </Badge>
        ) : (
          // show a green light if the kernel is running
          <Badge colorScheme="green" rounded="sm" size="lg">
            Online
          </Badge>
        )}
        <Select
          placeholder="Select Kernel"
          rounded="lg"
          size="sm"
          width="150px"
          ml={2}
          px={0}
          colorScheme="teal"
          icon={<MdArrowDropDown />}
          onChange={selectKernel}
          variant={'outline'}

        >
        {s.availableKernels.map(({ value, label }, index) => <option value={value} >{label}</option>)}
          {/*{s.availableKernels && s.availableKernels.map((kernel) => {*/}
          {/*  console.log(s.availableKernels);*/}
          {/*    const [key, value] = Object.entries(kernel)[0];*/}
          {/*    return (*/}
          {/*      <option key={key} value={value}>*/}
          {/*        {key}*/}
          {/*      </option>*/}
          {/*    );*/}
          {/*})}*/}
          {/* {s.kernels
            ? Object.keys(JSON.parse(s.kernels)).map((kernel) => (
                <option key={kernel} value={kernel}>
                  {kernel}
                </option>
              ))
            : null} */}
        </Select>

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
            <Button
              isDisabled={s.fontSize < 1}
              onClick={() => updateState(props._id, { fontSize: Math.max(1, s.fontSize / 1.2) })}
              _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
            >
              <MdRemove />
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
            <Button
              isDisabled={s.fontSize >= 3}
              onClick={() => updateState(props._id, { fontSize: Math.min(s.fontSize * 1.2, 3) })}
              _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
            >
              <MdAdd />
            </Button>
          </Tooltip>
        </ButtonGroup>
        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
            <Button onClick={downloadPy} _hover={{ opacity: 0.7 }}>
              <MdFileDownload />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
