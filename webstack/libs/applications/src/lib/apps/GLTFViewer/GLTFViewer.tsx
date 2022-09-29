/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useState, useEffect, useRef, Suspense } from 'react';
import { Box } from '@chakra-ui/react';
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';

import { useAppStore, useAssetStore, useUIStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

/**
 * Orbit controller
 */
const CameraController = () => {
  const { camera, gl } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 200;
    controls.zoomO = 4;
    return () => {
      controls.dispose();
    };
  }, [camera, gl]);
  return null;
};

/**
 * GLTF loader
 */
function Model3D({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
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

  // Board scale
  const scale = useUIStore((state) => state.scale);

  // Get the asset from the state id value
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // Get the URL from the asset
  useEffect(() => {
    if (file) {
      const localurl = '/api/assets/static/' + file.data.file;
      setUrl(localurl);
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <Box bgColor="rgb{156,162,146}" w={'100%'} h={'100%'} p={0} borderRadius="0 0 6px 6px">
        <Canvas style={{ height: props.data.size.height / scale + 'px', width: props.data.size.width / scale + 'px' }}>
          <CameraController />
          <ambientLight />
          <spotLight intensity={0.3} position={[5, 10, 50]} />
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
  return <></>;
}

export default { AppComponent, ToolbarComponent };
