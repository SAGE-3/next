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
  Menu, MenuButton, IconButton, MenuList, MenuItem, Portal,
} from '@chakra-ui/react'

import { GoKebabVertical } from "react-icons/go";
import {FiChevronDown} from "react-icons/fi";


import { useAppStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from "./index";
import { AppWindow } from '../../components';
import './styles.css';

import * as React from "react";
// import {ColumnMenu} from "./components/ColumnMenu";
import { colMenus } from "./colMenus";
import {useEffect} from "react";

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

  // function usePrevious(value: any) {
  //   const ref = useRef();
  //   useEffect(() => {
  //     console.log("useEffect useRef won't stop")
  //     ref.current = value;
  //   }, [value]);
  //   return ref.current;
  // }
  //
  // const prevDataState = usePrevious(s.viewData)

  useEffect(() => {
    if(s.viewData !== undefined) {
      console.log(s)
      updateState(props._id, { items: Object.values(s.viewData) });
      updateState(props._id, { headers: Object.keys(s.viewData[0]) });

      updateState(props._id, { loaded: true });
      console.log("s.viewData is not undefined")
      console.log(s.timestamp)
    }
  }, [s.timestamp])

  function handleUrlChange(ev:any){
    updateState(props._id, { dataUrl: ev.target.value})
  }

    function handleCellClick() {
        // updateState(props._id, {clicked: clicked})
        const cells = document.querySelectorAll('td');
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                updateState(props._id, { messages: "(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")" })
            })
        })
    }

  function handleTagClicks(info: string) {
    const cols = document.querySelectorAll("td[data-col=" + info + "]")
    cols.forEach((cell: any) => {
        if (!s.selected?.includes(info)) {
          const checked = s.selected.concat(info)
          updateState(props._id, {selected: checked})
          updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected' });
          cell.className= "highlight"
        } else {
          const unchecked = (() => (s.selected?.filter((item: string) => item != info)))()
          updateState(props._id, {selected: unchecked})
          updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected' });
          cell.className = "originalChakra"
          console.log("removed: " + info)

        }
      }
    )
    console.log("s.selected: " + s.selected)
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
      console.log("clicked the " + s.selected + " columns!")
      updateState(props._id,
        { executeInfo: {"executeFunc": "table_menu_click", "params": {"select": s.selected}}})
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
      console.log("Sorting on " + s.selected)
      updateState(props._id,
        { executeInfo: {"executeFunc": "table_sort", "params": {"select": s.selected}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function columnSort() {
      console.log("Sorting on " + s.selected)
      updateState(props._id,
        { executeInfo: {"executeFunc": "column_sort", "params": {"select": s.selected}}})
      console.log(s.executeInfo)
      console.log("----")
      console.log(s)
    }

    function dropColumns() {
      console.log("Dropping columns: " + s.selected)
      updateState(props._id,
        { executeInfo: {"executeFunc": "drop_columns", "params": {"select": s.selected}}})
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
        <div style={{ display: s.tableMenuAction !== "" ? "block" : "none" }}>
          <Alert status='info'>
            <AlertIcon/>
            {s.tableMenuAction}
          </Alert>
        </div>

        <div style={{ display: s.menuAction !== "" ? "block" : "none" }}>
          <Alert status='info'>
            <AlertIcon/>
            {s.menuAction}
          </Alert>
        </div>

        <div className="Subcomponent-Container" style={{ display: s.headers.length !== 0 ? "block" : "none" }}>
          <CheckboxGroup colorScheme='green' >
              <HStack spacing='10' display='flex' zIndex="dropdown">
                  {s.headers?.map((tag: any, index: number) => (
                      <Checkbox
                          value={tag}
                          onChange={(e) => handleTagClicks(tag)}
                      >
                          {tag}
                      </Checkbox>
                  ))}
                  <Menu>
                      <MenuButton
                          as={IconButton}
                          aria-label='Table Operations'
                          icon={<GoKebabVertical/>}
                          position='absolute'
                          right='15px'
                          size="xs"
                      />
                      <Portal>
                            <MenuItem as={TableMenu}/>
                      </Portal>
                  </Menu>
              </HStack>
          </CheckboxGroup>
        </div>

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

        <div style={{ display: s.viewData !== undefined ? "block" : "none" }}>
          <TableContainer overflowY="auto" display="flex" maxHeight="250px">
            <Table colorScheme="facebook" variant='simple' size="sm">
              <Thead>
                <Tr>
                  {
                    s.headers?.map((header: any, index: number) => (
                      <Th key={index}>
                        {header}
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
                  s.items?.map((item: any, index: number) => (
                    <Tr key={item.id}>
                      {Object.values(item).map((cell: any, index: number) => (
                        <Td key={index}
                            data-col={s.headers[index % s.headers.length] }
                            onClick={() => handleCellClick()}
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
