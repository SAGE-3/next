/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

import { Menu, MenuList, MenuItem, MenuButton, Button } from '@chakra-ui/react';

import { FaEllipsisH, FaEllipsisV, FaGripVertical, FaImages } from 'react-icons/fa';

import { useAction } from '@sage3/frontend/services';
import { LayoutType } from '@sage3/frontend/smart-data/layout';

export function LayoutButtons(props: { id: string; scaleBy: number; currentLayout: LayoutType }): JSX.Element {
  const { act } = useAction();
  return (
    <Menu placement="right-start">
      <MenuButton as={Button} mr="1rem" size={`${1 * props.scaleBy}rem`} colorScheme="teal" aria-label="layout">
        <FaEllipsisV size={`${props.scaleBy}rem`} />
      </MenuButton>
      <MenuList>
        <MenuItem
          onClick={() =>
            act({
              type: 'layout',
              id: props.id,
              layout: 'scroll-x',
            })
          }
          icon={<FaEllipsisH />}
        >
          Horizontal Scroll
        </MenuItem>
        <MenuItem
          onClick={() =>
            act({
              type: 'layout',
              id: props.id,
              layout: 'scroll-y',
            })
          }
          icon={<FaEllipsisV />}
        >
          Vertical Scroll
        </MenuItem>
        <MenuItem
          onClick={() =>
            act({
              type: 'layout',
              id: props.id,
              layout: 'grid',
            })
          }
          icon={<FaGripVertical />}
        >
          Grid
        </MenuItem>
        <MenuItem
          onClick={() =>
            act({
              type: 'layout',
              id: props.id,
              layout: 'carousel',
            })
          }
          icon={<FaImages />}
        >
          Carousel
        </MenuItem>
        {/* <Tooltip title="Freeform">
        <Button
          type={props.currentLayout === 'freeform' ? 'primary' : 'default'}
          onClick={function () {
            act({
              type: 'layout',
              id: props.id,
              layout: 'freeform',
            });
          }}
        >
          <>
            <FaProjectDiagram style={{ display: 'inline-block' }} />
          </>
        </Button>
      </Tooltip> */}
      </MenuList>
    </Menu>
  );
}
