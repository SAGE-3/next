/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {useAppStore, useAssetStore, useUIStore} from '@sage3/frontend';
import {Box, Button, IconButton, Select} from '@chakra-ui/react';
import {App} from '../../schema';

import {state as AppState} from './index';
import {AppWindow} from '../../components';
import {useEffect, useState} from "react";
import {BsFillTriangleFill} from "react-icons/bs";
import {generators} from "openid-client";
import {useParams} from "react-router";
import {useLocation} from "react-router-dom";
import {forEach} from "vega-lite/build/src/encoding";

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

  const [boardAppsQty, setBoardAppsQty] = useState(boardApps.length)

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

  // const [hostedAppsArr, setHostedAppsArr] = useState<App | never | any>([])

  useEffect(() => {
  //  TODO Track number of boardApps
    setBoardAppsQty(boardApps.length)
  }, [boardApps.length])

  //TODO Ask Ryan if ok to use delete operator, IE support?
  //TODO Remove hostedApps when they are deleted from board, removed from boardApps
  useEffect(() => {
    // handleOverlap()
    console.log('hosted useEffect')

    for (const app of boardApps) {
      const client = {
          [app._createdAt]: app._id
        }

      if (
        app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
        app.data.position.x + app.data.size.width > props.data.position.x &&
        app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
        app.data.size.height + app.data.position.y > props.data.position.y
      ) {
        console.log('app ' + app._id + ' added')

        if (!Object.values(s.hostedApps).includes(app._id)) {
          const hosted = {
            ...s.hostedApps,
            ...client
          }
          updateState(props._id, {hostedApps: hosted})
        } else {
          console.log('app ' + app._id + ' already in hostedApps')
        }
      } else {
        if (Object.values(s.hostedApps).includes(app._id)) {
          const localHosted = {...s.hostedApps}
          delete localHosted[app._createdAt]
          updateState(props._id, {hostedApps: localHosted})
          console.log('app ' + app._id + ' removed from hostedApps')
        }
      }
    }
    console.log('end of hosted useEffect')
    console.log('length of hostedappsarr ' + Object.keys(s.hostedApps).length)

    // }
  }, [selApp?.data.position.x, selApp?.data.position.y, selApp?.data.position.z, selApp?.data.size.height, selApp?.data.size.width])

  useEffect(() => {
    //    TODO Add indicator that apps are on the pane
    //    TODO Check what apps are currently client apps and what has been removed
  }, [selApp])

  const handleFileSelected = () => {
    // TODO
  }


  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
        <p>
          <>

            z index {zindex}<br/>
            selectedApp {selectedAppId}<br/>
            length of hostedappsarr {Object.keys(s.hostedApps).length}
            {/*Board assests dropdown*/}
            {/*<Select placeholder='Select File' onChange={handleFileSelected}>*/}
            {/*  {roomAssets.map(el =>*/}
            {/*    <option value={el._id}>{el.data.originalfilename}</option>)*/}
            {/*  }*/}
            {/*</Select>*/}
          </>
        </p>
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
