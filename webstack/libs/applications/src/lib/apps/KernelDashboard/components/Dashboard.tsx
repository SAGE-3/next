import { Badge, Box, Tab, Tabs, TabList, TabPanel, TabPanels } from '@chakra-ui/react';
import KernelsTab from './kernelsTab';
import SessionsTab from './sessionsTab';
import SpecTab from './kernelSpecsTab';
import { App } from '../../../schema';
import { state as AppState } from '..';
import { useAppStore } from '@sage3/frontend';
import { useEffect } from 'react';

export default function Dashboard(props: App): JSX.Element {

  const updateState = useAppStore((state) => state.updateState);
  const s = props.data.state as AppState;

  useEffect(() => {
    updateState(props._id, { executeInfo: { executeFunc: 'initialize', params: {} } });
  }, []); 

  return (
    <Box zIndex="popover" shadow="sm">
      <Tabs>
        <TabList>
          <Tab>
            Kernels{' '}
            <Badge ml={2} color="blue">
              {!s.kernels ? 0 : s.kernels.length}
              {/* JSON.stringify(s.kernels)} */}
              {/* {s.kernels.length} */}
            </Badge>
          </Tab>
          <Tab>
            Sessions{' '}
            <Badge ml={2} color="red">
              {!s.sessions ? 0 : s.sessions.length}
              {/* {s.sessions.length} */}
            </Badge>
          </Tab>
          <Tab>
            Other{' '}
            <Badge ml={2} color="yellow">
              1{/* {nominations.countAll()} */}
            </Badge>
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <KernelsTab />
          </TabPanel>
          <SessionsTab />
          <TabPanel>
            <SpecTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

