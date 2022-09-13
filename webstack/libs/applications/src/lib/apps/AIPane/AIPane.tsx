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

  // const [hostedAppsArr, setHostedAppsArr] = useState<App | never | any>([])

  useEffect(() => {
    // handleOverlap()
    console.log('hosted useEffect')
    for (const app of boardApps) {
      if (
        app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
        app.data.position.x + app.data.size.width > props.data.position.x &&
        app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
        app.data.size.height + app.data.position.y > props.data.position.y
      ) {
        console.log('collision')
        if (!s.hostedAppsArr?.includes(app)) {
          const hosted = [...s.hostedAppsArr, app]
          updateState(props._id, {hostedAppsArr: hosted})
          // console.log('hosted ' + hosted)
          // setHostedAppsArr(hosted)
          // setHostedAppsArr( [...hostedAppsArr, app])
        } else {
          console.log('app already hosted')
        }
        // if (!hostedAppsArr.includes(app)){
        //   setHostedAppsArr((clientAppsArr: any) => [...hostedAppsArr, selApp])
        // } else {
        //   console.log('Hosted app already in array')
        // }
      } else {
        console.log('no collision')
        const unhosted = (() => (s.hostedAppsArr?.filter((boardApp: App) => boardApp != app)))()
        console.log('unhosted' + unhosted)
        updateState(props._id, {hostedAppsArr: unhosted})
        // setHostedAppsArr(unhosted)
      }
    }
    console.log('here')
    console.log('length of hostedappsarr ' + typeof s.hostedAppsArr)
    // for (const hostedApps of s.hostedAppsArr) {
    //   console.log('a')
    //   console.log(hostedApps)
    // }
  }, [selApp?.data.position])

  useEffect(() => {
    //    TODO Add indicator that apps are on the pane
    //    TODO Check what apps are currently client apps and what has been removed
    //    Is it better to check the position of every app on the board?
    //    Or when client apps are dropped on pane, append to an array, then when they are dragged off, check if apps in array are still on board?
    //    If second option, what would be the trigger to detect that a client app has been selected and dragged off?
    //    TODO Ask Mahdi, behavior if AI Pane is dragged behind an app, instead of the other way around
    //    TODO Perhaps lock client apps onto pane by clicking on a lock icon

  }, [selApp])

  //   function handleHostedApps(info: string) {
  //   cols.forEach((cell: any) => {
  //       if (!hostedAppsArr?.includes(info)) {
  //         const hosted = hostedAppsArr.concat(info)
  //
  //       } else {
  //         const unhosted = (() => (hostedAppsArr?.filter((app: App) => app != info)))()
  //
  //       }
  //     }
  //   )
  // }


  function handleOverlap() {
    if (selectedAppId !== null) {
      console.log("selectedAppId !== null")
      if (selApp?.data.position !== undefined) {
        if (
          selApp.data.position.x + selApp.data.size.width < props.data.position.x + props.data.size.width &&
          selApp.data.position.x + selApp.data.size.width > props.data.position.x &&
          selApp.data.position.y + selApp.data.size.height < props.data.position.y + props.data.size.height &&
          selApp.data.size.height + selApp.data.position.y > props.data.position.y
        ) {
          // setHostedAppsArr((clientAppsArr: any) => [...clientAppsArr, selApp])
          console.log(s.hostedAppsArr.map(String))
          console.log("collision")
          console.log("selectedAppId " + selectedAppId + " collided with pane")
        } else {
          console.log("No collision")
        }
      } else {
        console.log("selApp?.data.position is undefined")
      }
    } else {
      console.log("selectedAppId === null")
    }
  }

  const handleFileSelected = () => {
    // TODO
  }


  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
        <p>
          x position {props.data.position.x}<br/>
          y position {props.data.position.y}<br/>
          z index {zindex}<br/>
          selectedApp {selectedAppId}<br/>
          <Select placeholder='Select File' onChange={handleFileSelected}>
            {roomAssets.map(el =>
              <option value={el._id}>{el.data.originalfilename}</option>)
            }
          </Select>
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
