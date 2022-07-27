/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  VStack,
  Badge,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  CheckboxGroup,
  HStack,
  Menu, MenuButton, IconButton, MenuList, MenuItem, Portal, ButtonGroup,
} from '@chakra-ui/react'

import { GoKebabVertical } from "react-icons/go";
import {FiChevronDown} from "react-icons/fi";


import { useAppStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from "./index";
import { AppWindow } from '../../components';
import './styles.css';

import React, { useState, useMemo, useEffect } from 'react';
// import {ColumnMenu} from "./components/ColumnMenu";
import { colMenus } from "./colMenus";

function AppComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  function handleLoadData() {
    console.log("in handleLoadData  and updating the executeInfo")

    updateState(props._id,
      { executeInfo: {"executeFunc": "load_data", "params": {"url": s.dataUrl}}})
    console.log("new value of executeInfo is ")
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  //TODO Is there a reason to set items? Does it cost memory or performance?
  //TODO Why are all the useEffects running multiple times upon loading?
  useEffect(() => {
    if(s.viewData !== undefined) {
      console.log(s)
      updateState(props._id, { items: Object.values(s.viewData) });
      // setTotalPosts(s.items.length)
      updateState(props._id, { headers: Object.keys(s.viewData[0]) });
      updateState(props._id, { loaded: true });
      console.log("first useEffect")
      console.log("s.viewData is not undefined")
    }
  }, [s.timestamp])

  useEffect(() => {
    if(s.items.length !== undefined) {
      // Get current posts
      const indexOfLastPost = s.currentPage * s.postsPerPage;
      const indexOfFirstPost = indexOfLastPost - s.postsPerPage;
      updateState(props._id, {currentPosts: s.items.slice(indexOfFirstPost, indexOfLastPost)})
      updateState(props._id, {totalPosts: s.items.length})
      console.log("second useEffect")
    }
  }, [s.items.length])

  useEffect(() => {
    // Get current posts
    const indexOfLastPost = s.currentPage * s.postsPerPage;
    const indexOfFirstPost = indexOfLastPost - s.postsPerPage;
    updateState(props._id, {currentPosts: s.items.slice(indexOfFirstPost, indexOfLastPost)})
    console.log("paginator useEffect")
  }, [s.currentPage])

  //TODO Warning: A component is changing an uncontrolled input to be controlled.
  // This is likely caused by the value changing from undefined to a defined value,
  // which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component
  function handleUrlChange(ev:any){
    updateState(props._id, { dataUrl: ev.target.value})
  }

    //TODO Fix delay in updatestate upon click
    function handleCellClick() {
        console.log('initial click')
        const cells = document.querySelectorAll('td');
        console.log('after cell declaration')
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                updateState(props._id, { messages: "(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")" })
            })
        })
       console.log('after click')
    }

  // function handleTagClicks(info: string) {
  //   const cols = document.querySelectorAll("td[data-col=" + info + "]")
  //   cols.forEach((cell: any) => {
  //       if (!s.selectedCols?.includes(info)) {
  //         const checked = s.selectedCols.concat(info)
  //         updateState(props._id, {selectedCols: checked})
  //         updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected' });
  //         cell.className= "highlight"
  //       } else {
  //         const unchecked = (() => (s.selectedCols?.filter((item: string) => item != info)))()
  //         updateState(props._id, {selectedCols: unchecked})
  //         updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected' });
  //         cell.className = "originalChakra"
  //         console.log("removed: " + info)
  //
  //       }
  //     }
  //   )
  //   console.log("s.selectedCols: " + s.selectedCols)
  // }

  function handleColClick(info: string) {
    const cols = document.querySelectorAll("td[data-col=" + info + "]")
    cols.forEach((cell: any) => {
        if (!s.selectedCols?.includes(info)) {
          const checked = s.selectedCols.concat(info)
          updateState(props._id, {selectedCols: checked})
          updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected' });
          cell.className= "highlight"
        } else {
          const unchecked = (() => (s.selectedCols?.filter((item: string) => item != info)))()
          updateState(props._id, {selectedCols: unchecked})
          updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected' });
          cell.className = "originalChakra"
          console.log("removed: " + info)

        }
      }
    )
    console.log("s.selectedCols: " + s.selectedCols)
  }


  function handleMenuClick() {
      console.log("clicked handleMenuClick, performing action")
      updateState(props._id,
        { executeInfo: {"executeFunc": "menu_click", "params": {}}})
      console.log("new value of executeInfo after menu click is ")
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)

    }

    function handleTableMenuClick() {
      console.log("clicked the " + s.selectedCols + " columns!")
      updateState(props._id,
        { executeInfo: {"executeFunc": "table_menu_click", "params": {"selected_cols": s.selectedCols}}})
      console.log("new value of executeInfo after table menu click is ")
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function transposeTable() {
      console.log("Transposing")
      updateState(props._id,
        { executeInfo: {"executeFunc": "transpose_table", "params": {}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function tableSort() {
      console.log("Sorting on " + s.selectedCols)
      updateState(props._id,
        { executeInfo: {"executeFunc": "table_sort", "params": {"selected_cols": s.selectedCols}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function columnSort() {
      console.log("Sorting on " + s.selectedCols)
      updateState(props._id,
        { executeInfo: {"executeFunc": "column_sort", "params": {"selected_cols": s.selectedCols}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function dropColumns() {
      console.log("Dropping columns: " + s.selectedCols)
      updateState(props._id,
        { executeInfo: {"executeFunc": "drop_columns", "params": {"selected_cols": s.selectedCols}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function restoreTable() {
      console.log("Restoring table")
      updateState(props._id,
        { executeInfo: {"executeFunc": "restore_table", "params": {}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

  const Pagination = () => {
    const pageNumbers = [];

    for (let i = 1; i <= Math.ceil(s.totalPosts / s.postsPerPage); i++) {
      pageNumbers.push(i);
    }

    function paginater(number: number) {
      console.log("paginate " + number)
      updateState(props._id, {currentPage: number})
      updateState(props._id, {currentPosts: s.currentPosts})
      updateState(props._id, {messages: "Currently on page " + number})
      console.log("current page " + s.currentPage)
      console.log("typeof currentPosts " + typeof s.currentPosts)
      console.log("currentPosts " + s.currentPosts)
    }

    //TODO Add left right arrow
    //TODO Add focus to current page number
    return (
      <div>
          <HStack spacing='5' display='flex' justify='center' zIndex='dropdown'>
            {pageNumbers.map((number: number) => (
              <Button
                key={number}
                onClick={(e) => paginater(number)}
              >
                {number}
              </Button>
            ))}
          </HStack>
      </div>
    );
  };

  //TODO Figure out how to perform column specific actions
  const ColumnMenu = () => (
    <MenuList>
      {colMenus.map((data, key) => {
        return (
          <MenuItem>
            <MenuButton
              as={Button}
              aria-label='Actions'
              size='xs'
              variant='link'
              onClick={handleMenuClick}
            >
              {data.col_function}
            </MenuButton>
          </MenuItem>
        )
      })
      }
    <MenuItem>
      <MenuButton
        as={Button}
        aria-label='Actions'
        size='xs'
        variant='link'
        onClick={columnSort}
      >
        Sort
      </MenuButton>
    </MenuItem>
    </MenuList>
  )

  const TableMenu = () => (
    <MenuList>
      {colMenus.map((data, key) => {
        return (
          <MenuItem>
            <MenuButton
              as={Button}
              aria-label='Actions'
              size='xs'
              variant='link'
              onClick={handleTableMenuClick}
            >
              {data.table_function}
            </MenuButton>
          </MenuItem>
        )
      })
      }
      <MenuItem>
        <MenuButton
          as={Button}
          aria-label='Actions'
          size='xs'
          variant='link'
          onClick={transposeTable}
        >
          Transpose Table
        </MenuButton>
      </MenuItem>
      <MenuItem>
        <MenuButton
          as={Button}
          aria-label='Actions'
          size='xs'
          variant='link'
          onClick={tableSort}
        >
          Sort on Selected Columns
        </MenuButton>
      </MenuItem>
      <MenuItem>
        <MenuButton
          as={Button}
          aria-label='Actions'
          size='xs'
          variant='link'
          onClick={dropColumns}
        >
          Drop Selected Columns
        </MenuButton>
      </MenuItem>
      <MenuItem>
        <MenuButton
          as={Button}
          aria-label='Actions'
          size='xs'
          variant='link'
          onClick={restoreTable}
        >
          Restore Original Table
        </MenuButton>
      </MenuItem>
    </MenuList>
  )


  return (
    <AppWindow app={props}>

      <>
        {/*<div style={{ display: s.tableMenuAction !== "" ? "block" : "none" }}>*/}
        {/*  <Alert status='info'>*/}
        {/*    <AlertIcon/>*/}
        {/*    {s.tableMenuAction}*/}
        {/*  </Alert>*/}
        {/*</div>*/}

        {/*<div style={{ display: s.menuAction !== "" ? "block" : "none" }}>*/}
        {/*  <Alert status='info'>*/}
        {/*    <AlertIcon/>*/}
        {/*    {s.menuAction}*/}
        {/*  </Alert>*/}
        {/*</div>*/}

        <div className="Message-Container" style={{ display: s.headers.length !== 0 ? "block" : "none" }}>
          {/*<CheckboxGroup colorScheme='green' >*/}
          {/*    <HStack spacing='10' display='flex' zIndex="dropdown">*/}
          {/*        {s.headers?.map((tag: any, index: number) => (*/}
          {/*            <Checkbox*/}
          {/*                value={tag}*/}
          {/*                onChange={(e) => handleTagClicks(tag)}*/}
          {/*            >*/}
          {/*                {tag}*/}
          {/*            </Checkbox>*/}
          {/*        ))}*/}
          {/*        <Menu>*/}
          {/*            <MenuButton*/}
          {/*                as={IconButton}*/}
          {/*                aria-label='Table Operations'*/}
          {/*                icon={<GoKebabVertical/>}*/}
          {/*                position='absolute'*/}
          {/*                right='15px'*/}
          {/*                size="xs"*/}
          {/*            />*/}
          {/*            <Portal>*/}
          {/*                  <MenuItem as={TableMenu}/>*/}
          {/*            </Portal>*/}
          {/*        </Menu>*/}
          {/*    </HStack>*/}
          {/*</CheckboxGroup>*/}
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label='Table Operations'
              icon={<GoKebabVertical/>}
              position='absolute'
              top='35px'
              right='15px'
              size="md"
            />
            <Portal>
              <MenuItem as={TableMenu}/>
            </Portal>
          </Menu>
        </div>

        <div className='URL-Container'>
          <InputGroup size='md'>
            {!s.loaded ? <Badge fontSize='1.5em' variant='solid' colorScheme='red'>Not loaded</Badge>:<Badge fontSize='1.5em' variant='solid' colorScheme='green'>Loaded</Badge>}
            <Input
              type="text"
              value={s.dataUrl}
              onChange={handleUrlChange}
              placeholder={'URL here'}
            />
            <InputRightElement width='5rem'>
              <Button variant='outline' onClick={handleLoadData}>Load Data</Button>
            </InputRightElement>
          </InputGroup>
        </div>

        <div style={{ display: s.viewData !== undefined ? "block" : "none" }}>
          <TableContainer overflowY="auto" display="flex" maxHeight="250px">
            <Table colorScheme="facebook" variant='simple' size="sm">
              <Thead>
                <Tr>
                  {
                    s.headers?.map((header: any, index: number) => (
                      <Th
                        key={index}
                        onClick={(e) => handleColClick(header)}
                      >
                        {header}
                        {/* TODO Make column menus disappear*/}
                        <Menu>
                          {({ isOpen }) => (
                            <>
                              <MenuButton
                                as={IconButton}
                                aria-label='Options'
                                size='sm'
                                variant='ghost'
                                icon={<FiChevronDown/>}
                                ml='20%'
                                isActive={isOpen}
                              />
                              <Portal>
                                <MenuItem as={ColumnMenu}/>
                              </Portal>
                            </>
                          )}
                        </Menu>
                      </Th>
                    ))
                  }
                </Tr>
              </Thead>

              <Tbody>
                {
                  s.currentPosts?.map((item: any, index: number) => (
                    <Tr key={item.id}>
                      {Object.values(item).map((cell: any, index: number) => (
                        <Td key={index}
                            data-col={s.headers[index % s.headers.length] }
                            onClick={(e) => handleCellClick()}
                        >
                          {cell}
                        </Td>
                      ))}
                    </Tr>
                  ))
                }
              </Tbody>
            </Table>
          </TableContainer>

        </div>

        <div className="Pagination-Container">
        <Pagination/>
        </div>

        <div className="Message-Container">
          <VStack spacing={3}>
            <Box
              fontWeight='bold'
            >
              Message Center
            </Box>
            <Alert status='info' variant='top-accent' colorScheme='telegram'>
              <AlertIcon />
              <AlertTitle>Feedback: </AlertTitle>
              <AlertDescription>{ s.messages }</AlertDescription>
              <AlertDescription></AlertDescription>
            </Alert>
          </VStack>
        </div>
      </>

    </AppWindow>
  )
}

function ToolbarComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <>
    </>
  )
}

export default { AppComponent, ToolbarComponent };
