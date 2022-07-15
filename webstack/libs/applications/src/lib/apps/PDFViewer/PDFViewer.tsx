/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import {
  Box, Button, ButtonGroup, Tooltip,
  Menu, MenuItem, MenuList, MenuButton,
  Stack, VStack, HStack,
} from '@chakra-ui/react';

import { App } from '../../schema';
import { Asset, ExtraPDFType } from '@sage3/shared/types';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAssetStore, useAppStore } from '@sage3/frontend';

// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';
// Icons
import {
  MdFileDownload,
  MdOutlineFastRewind,
  MdOutlineFastForward,
  MdAdd,
  MdRemove,
  MdMenu,
  MdSkipPrevious,
  MdSkipNext,
  MdNavigateNext,
  MdNavigateBefore,
} from 'react-icons/md';

function AppComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  const [urls, setUrls] = useState([] as string[]);
  const [file, setFile] = useState<Asset>();

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: 'PDF> ' + myasset?.data.originalfilename });
      // Updte the state of the app
      if (myasset.data.derived) {
        const pages = myasset.data.derived as ExtraPDFType;
        updateState(props._id, { numPages: pages.length });
      }
    }
  }, [s.id, assets]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        const allurls = pages.map((page) => {
          // find the smallest image for this page (multi-resolution)
          const res = page.reduce(function (p, v) {
            return p.width < v.width ? p : v;
          });
          return res.url;
        });
        setUrls(allurls);

        if (pages.length > 1) {
          const pageInfo = ' - ' + (s.currentPage + 1) + ' of ' + pages.length;
          update(props._id, { description: 'PDF> ' + file.data.originalfilename + pageInfo });
        }
      }
    }
  }, [file, s.currentPage]);

  return (
    <AppWindow app={props}>
      <HStack
        roundedBottom="md"
        bg="whiteAlpha.700"
        width="100%"
        height="100%"
        p={2}
      >
        {urls
          .filter((u, i) => i >= s.currentPage && i < s.currentPage + s.displayPages)
          .map((url, idx) =>
            <Box
              id={'pane~' + props._id + idx}
              p={1} m={1}
              bg="white" color="gray.800"
              shadow="base" rounded="lg" width={"100%"}
            >
              <img src={url} width={"100%"} draggable={false} alt={file?.data.originalfilename} />
            </Box>
          )
        }
      </HStack>
    </AppWindow>
  );
}


function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspecRatio] = useState(1);

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.id, assets]);


  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        // First page
        const page = pages[0];
        // First image of the page
        setAspecRatio(page[0].width / page[0].height);
      }
    }
  }, [file]);

  function handlePrev(amount = 1) {
    if (s.currentPage === 0) return;
    const newpage = s.currentPage - amount >= 0 ? s.currentPage - amount : 0;
    updateState(props._id, { currentPage: newpage });
  }

  function handleNext(amount = 1) {
    if (s.currentPage === s.numPages - s.displayPages) return;
    const newpage = s.currentPage + amount < s.numPages ? s.currentPage + amount : s.numPages - s.displayPages;
    updateState(props._id, { currentPage: newpage });
  }

  function handleFirst() {
    updateState(props._id, { currentPage: 0 });
  }

  function handleLast() {
    updateState(props._id, { currentPage: s.numPages - s.displayPages });
  }

  function handleAddPage() {
    if (s.displayPages < s.numPages) {
      const pageCount = s.displayPages + 1;
      updateState(props._id, { displayPages: pageCount });
      update(props._id, {
        size: {
          width: pageCount * props.data.size.height * aspectRatio,
          height: props.data.size.height,
          depth: props.data.size.depth,
        }
      });
    }
  }

  function handleRemovePage() {
    if (s.displayPages > 1) {
      const pageCount = s.displayPages - 1;
      updateState(props._id, { displayPages: pageCount });
      update(props._id, {
        size: {
          width: pageCount * props.data.size.height * aspectRatio,
          height: props.data.size.height,
          depth: props.data.size.depth,
        }
      });
    }
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button
            isDisabled={s.displayPages <= 1}
            onClick={() => handleRemovePage()}>
            <MdRemove />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button
            isDisabled={s.displayPages >= s.numPages}
            onClick={() => handleAddPage()}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handleFirst()}>
            <MdSkipPrevious />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handlePrev()}>
            <MdNavigateBefore />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === length - 1} onClick={() => handleNext()}>
            <MdNavigateNext />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === length - 1} onClick={() => handleLast()}>
            <MdSkipNext />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Menu placement="bottom">
          <Tooltip hasArrow={true} label={'Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="teal" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px">
            <MenuItem icon={<MdFileDownload />} onClick={() => {
              if (file) {
                const url = file?.data.file;
                const filename = file?.data.originalfilename
                downloadFile('api/assets/static/' + url, filename);
              }
            }}>
              Download
            </MenuItem>
            <MenuItem icon={<MdOutlineFastRewind />} onClick={() => handlePrev(10)}>
              Back 10 pages
            </MenuItem>
            <MenuItem icon={<MdOutlineFastForward />} onClick={() => handleNext(10)}>
              Forward 10 pages
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
