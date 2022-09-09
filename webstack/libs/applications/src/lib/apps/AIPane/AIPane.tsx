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

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const zindex = useUIStore((state) => state.zIndex);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const apps = useAppStore(state => state.apps);
  const selApp = apps.find(el => el._id === selectedAppId);

  const location = useLocation();
  const locationState = location.state as { roomId: string };
  const assets = useAssetStore(state => state.assets);
  const roomAssets = assets.filter(el => el.data.room == locationState.roomId);

  // const [paneStoredX, setPaneStoredX] = useState(props.data.position.x);
  // const [paneStoredY, setPaneStoredY] = useState(props.data.position.y);
  //
  // const [paneApp, setPaneApp] = useState("")

  useEffect(() => {
    console.log("before selectedApp useEffect")
    handleOverlap()
    console.log("after selectedApp useEffect")
  }, [selApp?.data.position])

  // useEffect(() => {
  //   setPaneStoredX(props.data.position.x)
  //   setPaneStoredY(props.data.position.y)
  //
  // }, [props.data.position])

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
          // setPaneApp(selApp._id)
          // handlePaneMovement(props.data.position.x, props.data.position.y)
          console.log("collision")
          console.log("selectedAppId " + selectedAppId + " collided with pane")
        } else {
          console.log("No collision")
        }
      } else {
        console.log("selApp?.data.position is undefined")
      }
    }
  }

  // function handlePaneMovement(currentX: number, currentY: number) {
  //   const paneBoundApp = apps.find(el => el._id === selectedAppId);
  //   if (paneBoundApp?.data.position !== undefined) {
  //     if (props.data.position.x !== paneStoredX || props.data.position.y !== paneStoredY) {
  //           const xMovement = props.data.position.x - paneStoredX
  //           const yMovement = props.data.position.y - paneStoredY
  //           paneBoundApp.data.position.x += xMovement
  //           paneBoundApp.data.position.y += yMovement
  //   }
  //   }
  // }



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
          selectedApp {selectedAppId}
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
  )
    ;
}

export default {AppComponent, ToolbarComponent};
