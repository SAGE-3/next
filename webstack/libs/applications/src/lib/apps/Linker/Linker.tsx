/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useEffect } from 'react';

// Chakra-UI
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  Grid,
  GridItem,
  MenuItemOption,
  MenuGroup,
  MenuOptionGroup,
  MenuDivider,
  Button,
  Center,
  Radio,
  RadioGroup,
  Stack,
  Text,
} from '@chakra-ui/react';

// SAGE
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAppStore } from '@sage3/frontend';

// Styling
import './styling.css';

/* App component for LinkerApp */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Stores
  const updateState = useAppStore((state) => state.updateState);
  const apps = useAppStore((state) => state.apps);

  //Find app1 and app2 to link
  const app1 = apps.find((el) => el._id == s.app1Id);
  const app2 = apps.find((el) => el._id == s.app2Id);

  //App State values
  let app1Value: any = null;
  let app2Value: any = null;

  //Update State Values
  if (s.app1Prop && app1) {
    app1Value = (app1.data.state as any)[s.app1Prop];
  }
  if (s.app2Prop && app2) {
    app2Value = (app2.data.state as any)[s.app2Prop];
  }

  // Check to see if app is deleted
  useEffect(() => {
    if (!app1) {
      updateState(props._id, { app1Id: 'none', app1Prop: 'none' });
    }

    if (!app2) {
      updateState(props._id, { app2Id: 'none', app2Prop: 'none' });
    }
  }, [app1, app2]);

  // Update state with app ids to find apps to link
  const handleChangeApp1 = (e: any) => {
    updateState(props._id, { app1Id: e.target.value });
  };
  const handleChangeApp2 = (e: any) => {
    updateState(props._id, { app2Id: e.target.value });
  };

  // "Link" apps together, listen to any state changes in app1
  // If change, update app2 with new value
  useEffect(() => {
    if (app1 && app2 && s.app2Prop !== 'none' && s.isLinked) {
      const value = app1Value;
      updateState(app2._id, { [s.app2Prop]: value });
    }
  }, [app1Value]);

  // Handler to choose what prop to change
  const handleProp1Change = (propName: string) => {
    updateState(props._id, { app1Prop: propName });
  };
  const handleProp2Change = (propName: string) => {
    updateState(props._id, { app2Prop: propName });
  };

  // Handle isLinked and !isLinked
  const handleLink = () => {
    updateState(props._id, { isLinked: !s.isLinked });
  };

  return (
    <AppWindow app={props}>
      <>
        <Grid templateColumns="repeat(7, 1fr)" gap={0}>
          {/* APP 1 */}
          <GridItem colSpan={3} w="100%" bg="black">
            <Center>
              <Box>
                {s.app1Id === 'none' ? 'None' : s.app1Id}
                <Menu colorScheme={'cyan'}>
                  <MenuButton as={Button}>App1 {'>'}</MenuButton>
                  {/* Display all apps */}
                  <MenuList>
                    {apps.map((app, index) => {
                      return (
                        <MenuItem key={index} value={app._id} onClick={(e) => handleChangeApp1(e)}>
                          {app.data.title}
                        </MenuItem>
                      );
                    })}
                  </MenuList>
                </Menu>

                <RadioGroup onChange={handleProp1Change} value={s.app1Prop}>
                  <Stack direction="column">
                    {/* Display state names */}
                    {app1
                      ? Object.keys(app1.data.state).map((propName: string, index: number) => {
                        //@ts-ignore
                        let type = typeof app1.data.state[propName];
                        // Only display primitive types. No Objects
                        if (type == 'object') {
                          return null;
                        } else {
                          return (
                            <Radio checked={true} key={index} value={propName}>
                              {propName}
                            </Radio>
                          );
                        }
                      })
                      : null}
                  </Stack>
                </RadioGroup>
                <p>{app1Value}</p>
              </Box>
            </Center>
          </GridItem>

          <GridItem bg="blackAlpha.500" colSpan={1} w="100%">
            <Center h="100%">
              <Stack>
                <Text textAlign="center">{s.isLinked ? 'Linked' : 'Not Linked'}</Text>
                <Text textAlign="center">{s.isLinked ? '=>' : '=/>'}</Text>
              </Stack>
            </Center>
          </GridItem>

          {/* APP 2 */}
          <GridItem colSpan={3} w="100%" bg="black">
            <Center>
              <Box>
                {s.app2Id === 'none' ? 'None' : s.app2Id}
                <Menu>
                  <MenuButton as={Button}>App2 {'>'}</MenuButton>
                  <MenuList>
                    {/* Display all apps */}
                    {apps.map((app, index) => {
                      return (
                        <MenuItem key={index} value={app._id} onClick={(e) => handleChangeApp2(e)}>
                          {app.data.title}
                        </MenuItem>
                      );
                    })}
                  </MenuList>
                </Menu>

                <RadioGroup onChange={handleProp2Change} value={s.app2Prop}>
                  <Stack direction="column">
                    {/* Display state names */}
                    {app2
                      ? Object.keys(app2.data.state).map((propName: string, index: number) => {
                        //@ts-ignore
                        let type = typeof app2.data.state[propName];
                        // Only display primitive types. No Objects
                        if (type == 'object') {
                          return null;
                        } else {
                          return (
                            <Radio key={index} value={propName}>
                              {propName}
                            </Radio>
                          );
                        }
                      })
                      : null}
                  </Stack>
                </RadioGroup>
                <p>{app2Value}</p>
              </Box>
            </Center>
          </GridItem>
        </Grid>

        <Center>
          <Stack direction={'column'}>
            <Button onClick={handleLink} colorScheme={'cyan'}>
              {s.isLinked ? 'Unlink Apps' : 'Link Apps'}
            </Button>
          </Stack>
        </Center>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app LinkerApp */
function ToolbarComponent(props: App) { return null; }

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
