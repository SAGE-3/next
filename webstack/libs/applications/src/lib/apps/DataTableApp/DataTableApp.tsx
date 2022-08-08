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
  Button,
  Center,
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
  HStack,
  Menu, MenuButton, IconButton, MenuList, MenuItem, Portal,
  Spinner,
} from '@chakra-ui/react'

import {GoKebabVertical} from "react-icons/go";
import {FiArrowLeft, FiArrowRight, FiChevronDown} from "react-icons/fi";


import {useAppStore} from '@sage3/frontend';
import {App} from "../../schema";

import {state as AppState} from "./index";
import {AppWindow} from '../../components';
import './styles.css';

import React, {useState, useMemo, useEffect} from 'react';
// import {ColumnMenu} from "./components/ColumnMenu";
import {colMenus} from "./colMenus";


const Pagination = (props: App): JSX.Element => {

  const s = props.data.state as AppState;
  const updateState = useAppStore(state => state.updateState);

  const [leftButtonDisable, setLeftButtonDisable] = useState(true)
  const [rightButtonDisable, setRightButtonDisable] = useState(true)

  function paginater(page: number) {
    updateState(props._id, {currentPage: page})
    updateState(props._id, {executeInfo: {"executeFunc": "paginate", "params": {}}})
    updateState(props._id, {messages: "Currently on page " + page})
    console.log("current page " + s.currentPage)
    console.log("new value of executeInfo is ")
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  function handleLeftArrow() {
    console.log("left arrow")
    updateState(props._id, {executeInfo: {"executeFunc": "handle_left_arrow", "params": {}}})
    if (s.currentPage !== 1) {
      setLeftButtonDisable(false)
      updateState(props._id, {messages: "Currently on page " + (s.currentPage)})
      console.log("current page " + (s.currentPage))
    } else {
      console.log("No page before 0")
      setLeftButtonDisable(true)
    }
  }

  function handleRightArrow() {
    console.log("right arrow")
    updateState(props._id, {executeInfo: {"executeFunc": "handle_right_arrow", "params": {}}})
    if (s.currentPage !== s.pageNumbers.length) {
      setRightButtonDisable(false)
      updateState(props._id, {messages: "Currently on page " + (s.currentPage)})
      console.log("current page " + (s.currentPage))
    } else {
      console.log("No page after " + s.pageNumbers.length)
      setRightButtonDisable(true)
    }
  }

  useEffect(() => {
    if (s.currentPage !== 1) {
      setLeftButtonDisable(false)
    } else {
      setLeftButtonDisable(true)
    }
    if (s.currentPage !== s.pageNumbers.length) {
      setRightButtonDisable(false)
    } else {
      setRightButtonDisable(true)
    }
    console.log("pagination useEffect")
  },[s.currentPage])


  //TODO Add focus to current page number
  return (
    <div>
      <HStack spacing='5' display='flex' justify='center' zIndex='dropdown'>
        <IconButton
          aria-label='Page left'
          icon={<FiArrowLeft/>}
          onClick={() => handleLeftArrow()}
          disabled={leftButtonDisable}
        />
        {s.pageNumbers.map((page: number) => (
          <Button
            key={page}
            onClick={(e) => paginater(page)}
          >
            {page}
          </Button>
        ))}
        <IconButton
          aria-label='Page right'
          icon={<FiArrowRight/>}
          onClick={() => handleRightArrow()}
          disabled={rightButtonDisable}
        />
      </HStack>
    </div>
  );
};

function AppComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  // Client local states
  const [data, setData] = useState([])
  const [headers, setHeaders] = useState([])
  const [indices, setIndices] = useState([])
  const [running, setRunning] = useState((s.executeInfo.executeFunc === "") ? false : true)


  // Array of function references to map through for table actions menu
  const tableActions = [tableSort, dropColumns, transposeTable, restoreTable]
  const tableMenuNames = ["Sort on Selected Columns", "Drop Selected Columns", "Transpose Table", "Restore Original Table"]

  // Array of function references to map through for column actions menu
  const columnActions = [columnSort, dropColumn]
  const columnMenuNames = ["Sort on Column", "Drop Column"]

  function handleLoadData() {
    console.log("in handleLoadData and updating the executeInfo")
    setRunning(true)
    updateState(props._id,
      {executeInfo: {"executeFunc": "load_data", "params": {}}})
    console.log("new value of executeInfo is ")
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)

  }

  useEffect(() => {
    (s.executeInfo.executeFunc === "") ? setRunning(false) : setRunning(true)
  }, [s.executeInfo.executeFunc])

  useEffect(() => {
    if (s.viewData != undefined && s.viewData.data != undefined) {
      setData(s.viewData.data)
      setHeaders(s.viewData.columns)
      setIndices(s.viewData.index)

      console.log("loading useEffect")
    }
  }, [s.timestamp])

  useEffect(() => {
    s.selectedCols.forEach((col: any) => {
      const cols = document.querySelectorAll("td[data-col=" + col + "]")
      cols.forEach((cell: any) => {
          cell.className = "highlight"
        }
      )
    })
    console.log("selectedCols useEffect")
  }, [JSON.stringify(s.selectedCols)])

  //TODO Warning: A component is changing an uncontrolled input to be controlled.
  // This is likely caused by the value changing from undefined to a defined value,
  // which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component
  function handleUrlChange(ev: any) {
    updateState(props._id, {dataUrl: ev.target.value})
  }

  //TODO Fix delay in updateState upon click
  function handleCellClick() {
    console.log('initial click')
    const cells = document.querySelectorAll('td');
    console.log('after cell declaration')
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        updateState(props._id, {messages: "(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")"})
      })
    })
    console.log('after click')
  }

  function handleColClick(info: string) {
    const cols = document.querySelectorAll("td[data-col=" + info + "]")
    cols.forEach((cell: any) => {
        if (!s.selectedCols?.includes(info)) {
          const checked = s.selectedCols.concat(info)
          updateState(props._id, {selectedCols: checked})
          updateState(props._id, {messages: (info).charAt(0).toUpperCase() + (info).slice(1) + ' tag selected'});
          cell.className = "highlight"
        } else {
          const unchecked = (() => (s.selectedCols?.filter((item: string) => item != info)))()
          updateState(props._id, {selectedCols: unchecked})
          updateState(props._id, {messages: (info).charAt(0).toUpperCase() + (info).slice(1) + ' tag unselected'});
          cell.className = "originalChakra"
        }
      }
    )
  }

  // Start of table wide functions
  function tableSort() {
    console.log("Sorting on " + s.selectedCols)
    updateState(props._id,
      {executeInfo: {"executeFunc": "table_sort", "params": {"selected_cols": s.selectedCols}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  //TODO Add Columns
  function addCols() {
    console.log("add column")
  }

  function dropColumns() {
    console.log("Dropping columns: " + s.selectedCols)
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_columns", "params": {"selected_cols": s.selectedCols}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)

    const cols = document.querySelectorAll("td")
    cols.forEach((cell: any) => {
        cell.className = "originalChakra"
      }
    )
  }

  function transposeTable() {
    console.log("Transposing")
    updateState(props._id,
      {executeInfo: {"executeFunc": "transpose_table", "params": {}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  function restoreTable() {
    console.log("Restoring table")
    updateState(props._id,
      {executeInfo: {"executeFunc": "restore_table", "params": {}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  //Start of single column functions
  function columnSort(column: any) {
    updateState(props._id, {selectedCol: column})
    console.log("Sorting on " + s.selectedCol)
    updateState(props._id,
      {executeInfo: {"executeFunc": "column_sort", "params": {"selected_col": s.selectedCol}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  function dropColumn(column: any) {
    updateState(props._id, {selectedCol: column})
    console.log("Dropping column: " + s.selectedCol)
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_column", "params": {"selected_col": s.selectedCol}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)

    const cols = document.querySelectorAll("td")
    cols.forEach((cell: any) => {
        cell.className = "originalChakra"
      }
    )
  }

  return (
    <AppWindow app={props}>

      <>
        <div className="Message-Container" style={{display: headers.length !== 0 ? "block" : "none"}}>
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
            {/*TODO figure out why chakra sends table menu to another dimension*/}
            <Portal>
              <MenuList>
                {tableActions.map((action, key) => {
                  return (
                    <MenuItem
                      key={key}
                      onClick={action}
                    >
                      {tableMenuNames[key]}
                    </MenuItem>
                  )
                })
                }
              </MenuList>
            </Portal>
          </Menu>
        </div>

        <div className='URL-Container'>
          <InputGroup size='md'>
            <Input
              type="text"
              value={s.dataUrl}
              onChange={handleUrlChange}
              placeholder={'URL here'}
            />
            <InputRightElement width='5rem'>
              <Button variant='outline' onClick={handleLoadData} disabled={running}>Load Data</Button>
            </InputRightElement>
          </InputGroup>
        </div>


        <Center>
          <Spinner
            style={{display: (s.executeInfo.executeFunc === "") ? "none" : "flex"}}
            justify-content='center'
            thickness='4px'
            speed='3s'
            emptyColor='gray.200'
            color='blue.500'
            size='xl'
          />
        </Center>

        <div>
          <p>s.selectedCols: {s.selectedCols}</p>
        </div>

        <div style={{display: s.totalRows !== 0 ? "block" : "none"}}>
          <TableContainer overflowY="auto" display="flex" maxHeight="250px">
            <Table colorScheme="facebook" variant='simple' size="sm" className="originalChakra">
              <Thead>
                <Tr>
                  <Th className="indexColumn">
                  </Th>
                  {
                    headers?.map((header: any, index: number) => (
                      <Th
                        key={index}
                        onClick={(e) => handleColClick(header)}
                      >
                        {header}
                        {/* TODO Make column menus disappear*/}
                        <Menu>
                          {({isOpen}) => (
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
                                <MenuList>
                                  {columnActions.map((action, key) => {
                                    return (
                                      <MenuItem
                                        key={key}
                                        onClick={action}
                                      >
                                        {columnMenuNames[key]}
                                      </MenuItem>
                                    )
                                  })
                                  }
                                </MenuList>
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
                  data?.map((row: any, rowIndex: number) => (
                    <Tr key={rowIndex}>
                      <Td key={rowIndex}>
                        {indices[rowIndex]}
                      </Td>
                      {row.map((cell: any, colIndex: number) => (
                        <Td key={colIndex}
                            data-col={headers[colIndex % headers.length]}
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

        <div className="Pagination-Container"
             style={{display: s.pageNumbers.length !== 0 ? "block" : "none"}}>
          <Pagination {...props}/>
        </div>

        <div className="Message-Container">
          <VStack spacing={3}>
            <Box
              fontWeight='bold'
            >
              Message Center
            </Box>
            <Alert status='info' variant='top-accent' colorScheme='telegram'>
              <AlertIcon/>
              <AlertTitle>Feedback: </AlertTitle>
              <AlertDescription>{s.messages}</AlertDescription>
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

export default {AppComponent, ToolbarComponent};
