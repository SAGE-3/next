/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {useAppStore, useAssetStore, useUIStore} from '@sage3/frontend';
import {Box, Button, Icon, IconButton, Select} from '@chakra-ui/react';
import {App, AppName} from '../../schema';
import './styles.css';

import {state as AppState} from './index';
import {AppWindow} from '../../components';
import {useEffect, useState, useRef} from "react";
import {BsFillTriangleFill} from "react-icons/bs";
import {FcCancel, FcOk} from "react-icons/fc"
import {useLocation} from "react-router-dom";

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const zindex = useUIStore((state) => state.zIndex);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const boardApps = useAppStore(state => state.apps);
  const selApp = boardApps.find(el => el._id === selectedAppId);

  const location = useLocation();
  const locationState = location.state as { roomId: string };
  const assets = useAssetStore(state => state.assets);
  const roomAssets = assets.filter(el => el.data.room == locationState.roomId);

  const prevBoardsAppsQty = useRef<number>(0)

  // Way to manage a collection of App objects in local state
  // const apps = useAppStore(state => state.apps);

  // const [selApps, setSelApps] = useState<App[]>([]);
  //
  // useEffect(() => {
  //   const selAppsArray = [] as App[];
  //   Object.keys(s.hostedApps).forEach(id => {
  //     const app = apps.find(app => app._id === id);
  //     if (app) selAppsArray.push(app)
  //   });
  //   setSelApps(selAppsArray);
  // }, [JSON.stringify(s.hostedApps), apps])

  useEffect(() => {
    for (const app of boardApps) {
      const client = {
        [app._id]: app._id
      }
  const includedAppTypes: AppName[] = ['AIPane']
      if (
        app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
        app.data.position.x + app.data.size.width > props.data.position.x &&
        app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
        app.data.size.height + app.data.position.y > props.data.position.y
      ) {
        //TODO do something to ignore AIPanes
        // if (app.data.type === 'AIPane')
        if (!Object.values(s.hostedApps).includes(app._id)) {
          const hosted = {
            ...s.hostedApps,
            ...client
          }
          updateState(props._id, {hostedApps: hosted})
          console.log('app ' + app._id + ' added')
          prevBoardsAppsQty.current += 1
        } else {
          console.log('app ' + app._id + ' already in hostedApps')
        }
      } else {
        if (Object.values(s.hostedApps).includes(app._id)) {
          const localHosted = {...s.hostedApps}
          delete localHosted[app._id]
          updateState(props._id, {hostedApps: localHosted})
          console.log('app ' + app._id + ' removed from hostedApps')
        }
      }
    }
  }, [selApp?.data.position.x, selApp?.data.position.y, selApp?.data.position.z, selApp?.data.size.height, selApp?.data.size.width])

  //TODO Be mindful of client updates
  // Currently, every client updates once one does. Eventually add a way to monitor userID's and let only one person send update to server
  // Refer to videoViewer play function
  useEffect(() => {
    const appIds = boardApps.map(el => el._id);
    const copyofhostapps = {} as {[key: string]: string};
    // if (boardApps.length <= prevBoardsAppsQty.current) {

     Object.keys(s.hostedApps).forEach((key: string) => {
        if (appIds.includes(s.hostedApps[key])) copyofhostapps[key] = key;
      });
     updateState(props._id, {hostedApps: copyofhostapps})
    // }
  }, [boardApps.length])

  useEffect(() => {
    testFunction()
  }, [Object.keys(s.hostedApps).length])

  const handleFileSelected = () => {
    // TODO
  }

  function testFunction() {
    updateState(props._id, {executeInfo: {"executeFunc": "test_function", "params": {}}})
  }


  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
        <Box
          position='absolute'
          right='50px'
          top='50px'
        >
          {Object.keys(s.hostedApps).length > 0 ? (<Icon as={FcOk}/>) : (<Icon as={FcCancel}/>)}
        </Box>

        <>
          selectedApp {selectedAppId}<br/>
          length of hostedappsarr {Object.keys(s.hostedApps).length}<br/>
          hostedapps: {Object.values(s.hostedApps)}<br/>
          {/*Board assests dropdown*/}
          {/*<Select placeholder='Select File' onChange={handleFileSelected}>*/}
          {/*  {roomAssets.map(el =>*/}
          {/*    <option value={el._id}>{el.data.originalfilename}</option>)*/}
          {/*  }*/}
          {/*</Select>*/}
        </>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <IconButton
        aria-label="Run AI"
        icon={<BsFillTriangleFill/>}
        _hover={{opacity: 0.7, transform: 'scaleY(1.3)'}}
      />
    </>
  );
}

export default {AppComponent, ToolbarComponent};
