/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, Suspense, useRef } from 'react';
import { Box, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';

// Icons
import { MdFileDownload } from 'react-icons/md';

// Threejs
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';

// SAGE3
import { useAppStore, useAssetStore, useUIStore, apiUrls, downloadFile } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

// App
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

type CameraProps = {
  id: string;
  state: { p: number; a: number; d: number };
};

/**
 * Orbit controller
 */
const CameraController = (props: CameraProps) => {
  const { camera, gl, invalidate } = useThree();
  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    // console.log('Need to update camera state>', props.state.p, props.state.a, props.state.d);
  }, [props.state.p, props.state.a, props.state.d]);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 200;
    // controls.zoom0 = 4;

    controls.addEventListener('change', (e: any) => {
      // redraw
      invalidate();
    });
    controls.addEventListener('end', (e: any) => {
      const p = controls.getPolarAngle();
      const a = controls.getAzimuthalAngle();
      const d = controls.getDistance();
      updateState(props.id, { p, a, d });
    });
    return () => {
      controls.dispose();
    };
  }, [camera, gl]);
  return null;
};

function FrameLimiter({ limit = 2 }) {
  const { invalidate, clock } = useThree();
  useEffect(() => {
    let delta = 0;
    const interval = 1 / limit;
    const update = () => {
      requestAnimationFrame(update);
      delta += clock.getDelta();
      if (delta > interval) {
        invalidate();
        delta = delta % interval;
      }
    };
    update();
  }, []);
  return null;
}

/**
 * GLTF loader
 */
function Model3D({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;

  // const mesh = useRef<THREE.Group>();
  // useFrame(() => {
  //   if (mesh.current) {
  //     mesh.current.rotation.x = mesh.current.rotation.y += 0.01;
  //   }
  // });
  // return <primitive ref={mesh} object={gltf.scene} />;
}

function AppComponent(props: App): JSX.Element {
  // App state
  const s = props.data.state as AppState;
  // Update the app
  const update = useAppStore((state) => state.update);
  // Asset store
  const assets = useAssetStore((state) => state.assets);
  // Get the asset
  const [file, setFile] = useState<Asset>();
  const [url, setUrl] = useState<string>('');
  const [orientation, setOrientation] = useState({ p: s.p, a: s.a, d: s.d });

  // Update from server
  useEffect(() => {
    // console.log('Got>', s.p, s.a, s.d);
    setOrientation({ p: s.p, a: s.a, d: s.d });
  }, [s.a, s.p, s.d]);

  // Board scale
  const scale = useUIStore((state) => state.scale);

  // Get the asset from the state id value
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { title: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // Get the URL from the asset
  useEffect(() => {
    if (file) {
      const localurl = apiUrls.assets.getAssetById(file.data.file);
      setUrl(localurl);
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <Box bgColor="rgb{156,162,146}" w={'100%'} h={'100%'} p={0} borderRadius="0 0 6px 6px">
        <Canvas
          style={{ height: props.data.size.height / scale + 'px', width: props.data.size.width / scale + 'px' }}
          shadows={false}
          dpr={1}
          frameloop={'demand'}
          gl={{ powerPreference: 'low-power', antialias: false }}
        >
          {/* <FrameLimiter limit={10} /> */}
          <CameraController id={props._id} state={orientation} />
          <ambientLight intensity={1} />
          <spotLight intensity={0.75} position={[15, 100, 50]} />
          <primitive object={new THREE.AxesHelper(5)} />
          <Suspense fallback={null}>
            <Model3D url={url} />
          </Suspense>
        </Canvas>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Convert the ID to an asset
  useEffect(() => {
    const appasset = assets.find((a) => a._id === s.assetid);
    if (appasset) setFile(appasset);
  }, [s.assetid, assets]);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Download Model'} openDelay={400}>
          <Button
            onClick={() => {
              if (file) {
                const url = file?.data.file;
                const filename = file?.data.originalfilename;
                const dl = apiUrls.assets.getAssetById(url);
                downloadFile(dl, filename);
              }
            }}
            size='xs'
            px={0}
          >
            <MdFileDownload size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
