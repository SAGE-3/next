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
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuItem,
  Portal,
  Select,
  Spinner,
  MenuDivider,
  ButtonGroup,
  FormControl,
  FormLabel,
  Stack,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent, PopoverCloseButton, PopoverArrow, FormHelperText,
} from '@chakra-ui/react'

import {GoKebabVertical} from "react-icons/go";
import {FiArrowLeft, FiArrowRight, FiChevronDown, FiMoreHorizontal} from "react-icons/fi";
import {TbWorldDownload} from "react-icons/tb";

import FocusLock from 'react-focus-lock';

import {App} from "../../schema";

import {state as AppState} from "./index";
import {AppWindow} from '../../components';
import './styles.css';

import {useState, useEffect, useMemo} from 'react';
import {useAppStore, useAssetStore} from '@sage3/frontend';

import {Asset} from '@sage3/shared/types';
import {parse} from 'csv-parse/browser/esm';
import {useLocation} from "react-router-dom";
import {useParams} from "react-router";
import {v4 as getUUID} from "uuid";

const Pagination = (props: App): JSX.Element => {

  const s = props.data.state as AppState;
  const updateState = useAppStore(state => state.updateState);

  // Pagination buttons
  const [leftButtonDisable, setLeftButtonDisable] = useState(true)
  const [rightButtonDisable, setRightButtonDisable] = useState(true)
  const [pageNumbers, setPageNumbers] = useState([0])

  // Generates dropdown for how many rows to display per page
  const rowsPerPageArr = useMemo(() => {
    const rowDisplayOptions = []
    const minRows = 1
    const maxRows = 10

    for (let i = minRows; i <= maxRows; i++) {
      rowDisplayOptions.push(i)
    }
    return (rowDisplayOptions)
  }, [])

  // Sets current page and calls python to perform pagination
  function paginater(page: number) {
    updateState(props._id, {currentPage: page})
    updateState(props._id, {executeInfo: {"executeFunc": "paginate", "params": {}}})
    // updateState(props._id, {messages: "Currently on page " + page})
  }

  // Calls python to set number of rows displayed per page
  const handleRowDisplayCount = (rows: number) => {
    updateState(props._id, {rowsPerPage: rows})
    updateState(props._id, {executeInfo: {"executeFunc": "paginate", "params": {}}})
  }

  // If not on page 1, calls python to display rows of previous page.
  function handleLeftArrow() {
    updateState(props._id, {executeInfo: {"executeFunc": "handle_left_arrow", "params": {}}})
    if (s.currentPage !== 1) {
      setLeftButtonDisable(false)
      updateState(props._id, {messages: "Currently on page " + (s.currentPage)})
    } else {
      console.log("No page before 1")
      setLeftButtonDisable(true)
    }
  }

  // If not on last page, calls python to display rows of next page.
  function handleRightArrow() {
    updateState(props._id, {executeInfo: {"executeFunc": "handle_right_arrow", "params": {}}})
    if (s.currentPage !== s.pageNumbers.length) {
      setRightButtonDisable(false)
      updateState(props._id, {messages: "Currently on page " + (s.currentPage)})
    } else {
      console.log("No page after " + s.pageNumbers.length)
      setRightButtonDisable(true)
    }
  }

  // TODO Investigate why disabling left and right buttons here as well
  // Disables left and right buttons if current page is first or last.
  // Displays page numbers to skip to
  useEffect(() => {
    if (s.currentPage !== 1) {
      setLeftButtonDisable(false)
      if (s.currentPage + 1 !== s.pageNumbers.length) {
        setPageNumbers([s.currentPage - 1, s.currentPage, s.currentPage + 1])
      }
    } else {
      setLeftButtonDisable(true)
      if (s.pageNumbers.length > 1) {
        setPageNumbers([1, 2])
      } else {
        setPageNumbers([1])
      }
    }
    if (s.currentPage !== s.pageNumbers.length) {
      setRightButtonDisable(false)
    } else {
      setRightButtonDisable(true)
      setPageNumbers([s.currentPage - 1, s.currentPage])
    }
  }, [s.currentPage, JSON.stringify(s.pageNumbers)])


  return (
    <div>
      <HStack spacing='5' display='flex' justify='center'>
        <IconButton
          aria-label='Page left'
          icon={<FiArrowLeft/>}
          variant='link'
          onClick={() => handleLeftArrow()}
          disabled={leftButtonDisable}
        />
        <div style={
          {
            display:
              s.currentPage - 1 !== 1
              && s.currentPage !== 1 ? "block" : "none"
          }}
        >
          <Menu>
            <MenuButton as={IconButton} icon={<FiMoreHorizontal/>} variant='link' size='xs'>
              {s.rowsPerPage}
            </MenuButton>
            <Portal>
              <MenuList display='flex' maxW='sm' zIndex="dropdown" overflowY="scroll">
                {s.pageNumbers.map((page: number) => (
                  <Button
                    key={page}
                    onClick={(e) => paginater(page)}
                    variant={s.currentPage === page ? 'solid' : 'link'}
                    size='sm'
                  >
                    {page}
                  </Button>
                ))}
              </MenuList>
            </Portal>
          </Menu>
        </div>
        {pageNumbers.map((page: number) => (
          <Button
            key={page}
            onClick={(e) => paginater(page)}
            variant={s.currentPage === page ? 'solid' : 'link'}
          >
            {page}
          </Button>
        ))}
        <div style={
          {
            display:
              s.currentPage + 1 !== s.pageNumbers.length
              && s.currentPage !== s.pageNumbers.length ? "block" : "none"
          }}
        >
          <Menu size="xs">
            <MenuButton as={IconButton} icon={<FiMoreHorizontal/>} variant='link' size='xs'>
              {s.rowsPerPage}
            </MenuButton>
            <Portal>
              <MenuList display='flex' maxW='sm' zIndex="dropdown" overflowY="scroll">
                {s.pageNumbers.map((page: number) => (
                  <Button
                    key={page}
                    onClick={(e) => paginater(page)}
                    variant={s.currentPage === page ? 'solid' : 'link'}
                  >
                    {page}
                  </Button>
                ))}
              </MenuList>
            </Portal>
          </Menu>
        </div>
        <IconButton
          aria-label='Page right'
          icon={<FiArrowRight/>}
          variant='link'
          onClick={() => handleRightArrow()}
          disabled={rightButtonDisable}
        />
      </HStack>
      <HStack justify='right'>
        <Menu size="xs">
          <MenuButton as={Button} rightIcon={<FiChevronDown/>} variant='solid' size='xs'>
            {s.rowsPerPage}
          </MenuButton>
          <Portal>
            <MenuList>
              {
                rowsPerPageArr.map((rows: number, key: number) => {
                  return (
                    <MenuItem
                      key={key}
                      onClick={() => handleRowDisplayCount(rows)}
                    >
                      {rows}
                    </MenuItem>
                  )
                })
              }
            </MenuList>
          </Portal>
        </Menu>
        <Box fontSize='xs'>Rows per page</Box>
      </HStack>
      <Box fontSize='xs' font-style='oblique' float='right'>
        <p>Showing {s.indexOfFirstRow} - {s.indexOfLastRow - 1} of {s.totalRows} rows</p>
        <p>Page {s.currentPage} of {s.pageNumbers[s.pageNumbers.length - 1]}</p>
      </Box>
    </div>
  );
};

function AppComponent(props: App): JSX.Element {

  // App state
  const s = props.data.state as AppState;
  // Update the app
  const update = useAppStore((state) => state.update);

  const updateState = useAppStore(state => state.updateState);

  // Client local states
  // const [data, setData] = useState([])
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([])
  const [indices, setIndices] = useState<string[]>([])
  const [running, setRunning] = useState((s.executeInfo.executeFunc === "") ? false : true)
  const [filterInput, setFilterInput] = useState('')

  const {onOpen, onClose, isOpen} = useDisclosure()


  // TODO Move to a JSON?
  // Array of function references to map through for table actions menu
  const tableColActions = [tableSort, dropColumns]
  const tableColMenuNames = ["Sort on Selected Columns", "Drop Selected Columns"]

  const tableColActs = {"Sort on Selected Columns": tableSort, "Drop Selected Columns": dropColumns}

  // Array of function references to map through for table actions menu
  const tableRowActions = [dropRows]
  const tableRowMenuNames = ["Drop Selected Rows"]

  const tableRowActs = {"Drop Selected Rows": dropRows}

  // Array of function references to map through for table actions menu
  const tableActions = [transposeTable, restoreTable]
  const tableMenuNames = ["Transpose Table", "Restore Original Table"]

  const tableActs = {"Transpose Table": transposeTable, "Restore Original Table": restoreTable}

  // Array of function references to map through for column actions menu
  const columnActions = [columnSort, dropColumn]
  const columnMenuNames = ["Sort on Column", "Drop Column"]

  const columnActs = {"Sort on Column": columnSort, "Drop Column": dropColumn}

  // TODO Change from URLs to SAGE assets
  // Call python to load data from source
  function handleLoadData() {
    setRunning(true)
    updateState(props._id,
      {executeInfo: {"executeFunc": "load_data", "params": {"url": s.dataUrl}}})
  }

  //   // Get the asset from the state id value
  // useEffect(() => {
  //   const myasset = assets.find((a) => a._id === s.assetid);
  //   if (myasset) {
  //     setFile(myasset);
  //     // Update the app title
  //     update(props._id, { title: myasset?.data.originalfilename });
  //   }
  // }, [s.assetid, assets]);
  //
  // // Get the data from the asset
  // useEffect(() => {
  //   if (file) {
  //     const localurl = '/api/assets/static/' + file.data.file;
  //     if (localurl) {
  //       fetch(localurl, {
  //         headers: {
  //           'Content-Type': 'text/csv',
  //           Accept: 'text/csv',
  //         },
  //       })
  //         .then(function (response) {
  //           return response.text();
  //         })
  //         .then(async function (text) {
  //           // Convert the csv to an array
  //           const arr = await csvToArray(text);
  //           // save the data
  //           setData(arr);
  //           // extract the headers and save them
  //           const headers = Object.keys(arr[0]);
  //           setHeaders(headers);
  //           // setTableWidth(95 / headers.length);
  //         });
  //     }
  //   }
  // }, [file]);

  // TODO Should this be tied to something else? Is this best way to propagate change to all clients?
  // Sets run icon to false when there is no call being made to python
  useEffect(() => {
    (s.executeInfo.executeFunc === "") ? setRunning(false) : setRunning(true)
  }, [s.executeInfo.executeFunc])

  // TODO Why does this rely on a timestamp?
  // When a dataset is loaded in, set table contents, headers, indices currently shown
  // This sets every time paginator is called?
  useEffect(() => {
    if (s.viewData != undefined && s.viewData.data != undefined) {
      setData(s.viewData.data)
      setHeaders(s.viewData.columns)
      setIndices(s.viewData.index)
    }
  }, [s.timestamp, s.rowsPerPage])

  // One array: Reset the className of all cells, then iterate through selected columns array and highlight them
  // useEffect(() => {
  //   const table: any = document.querySelector('table')
  //   const cells: any = table.querySelectorAll('td')
  //   cells.forEach((cell: any) => {
  //     cell.className = "originalChakra"
  //   })
  //   s.selectedCols.forEach((col) => {
  //     const cols = document.querySelectorAll("td[data-col=" + col + "]")
  //     cols.forEach((cell: any) => {
  //       cell.className = "highlight"
  //       }
  //     )
  //   })
  //   console.log("ONE ARRAY selectedCols useEffect")
  // }, [JSON.stringify(s.selectedCols)])

  // TODO There has to be a better way to do this rather than grab every cells and set their classes individually
  // Grabs all cells, checks if their data-col tag is in selectedCols, then individually sets all of these cells to blank cell css class
  // If cell data-col tag is in selectedCols, sets to highlight class
  // Why is indices[] a trigger?
  useEffect(() => {
    const colDifference = headers?.filter(x => !s.selectedCols.includes(x));
    colDifference.forEach((col) => {
      const cols = document.querySelectorAll("td[data-col='" + col.replace(/\s+/g, '') + "']")
      cols.forEach((cell: any) => {
          cell.className = "originalChakra"
        }
      )
    })
    s.selectedCols.forEach((col) => {
      const cols = document.querySelectorAll("td[data-col='" + col.replace(/\s+/g, '') + "']")
      cols.forEach((cell: any) => {
          cell.className = "highlight"
        }
      )
    })
  }, [JSON.stringify(s.selectedCols), indices.length])

  // TODO Figure out a better way to highlight rows. Currently grabs and checks every cell individually, setting each to a css class
  //Highlighting for row selection
  useEffect(() => {
    const rowDifference = indices.filter(x => !s.selectedRows.includes(x));

    rowDifference.forEach((row) => {
      const rows = document.querySelectorAll("td[data-row='" + row + "']")
      rows.forEach((cell: any) => {
          cell.className = "originalChakra"
        }
      )
    })
    s.selectedRows.forEach((row) => {
      const rows = document.querySelectorAll("td[data-row='" + row + "']")
      rows.forEach((cell: any) => {
          cell.className = "highlight"
        }
      )
    })
  }, [JSON.stringify(s.selectedRows)])

  //TODO Change to load from SAGE assets and depracate this
  // Warning: A component is changing an uncontrolled input to be controlled.
  // This is likely caused by the value changing from undefined to a defined value,
  // which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component
  function handleUrlChange(ev: any) {
    updateState(props._id, {dataUrl: ev.target.value})
  }

  // TODO Fix delay in updateState upon click
  // Sets message for what cell is clicked... Necessary?
  function handleCellClick() {
    const cells = document.querySelectorAll('td');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        updateState(props._id, {messages: "(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")"})
      })
    })
  }

  // TODO Currently checks all cells, can we just check headers?
  // Adds a column to selectedCols and sets a messsage for selectedCols
  function handleColClick(info: string) {
    const cols = document.querySelectorAll("td[data-col=" + info.replace(/\s+/g, '') + "]")
    cols.forEach((cell: any) => {
        if (!s.selectedCols?.includes(info)) {
          const checked = s.selectedCols.concat(info)
          updateState(props._id, {selectedCols: checked})
          updateState(props._id,
            {
              messages:
                (info).charAt(0).toUpperCase() + (info).slice(1) + ' column selected ---'
                + ' Selected Columns: ' + checked.toString()
            });
        } else {
          const unchecked = (() => (s.selectedCols?.filter((item: string) => item != info)))()
          updateState(props._id, {selectedCols: unchecked})
          updateState(props._id,
            {
              messages: (info).charAt(0).toUpperCase() + (info).slice(1) + ' column unselected ---'
                + ' Selected Columns: ' + unchecked.toString()
            });
        }
      }
    )
  }

  // TODO Again, find better way to highlight rows, rather than grabbing every cell and setting each individual cell to a specific css class
  function handleRowClick(info: string) {
    const row = document.querySelectorAll("td[data-row='" + info + "']")
    row.forEach((cell: any) => {
        if (!s.selectedRows?.includes(info)) {
          const checked = s.selectedRows.concat(info)
          updateState(props._id, {selectedRows: checked})
          updateState(props._id, {messages: 'Row ' + info + ' selected ---' + ' Selected Rows: ' + checked.toString()});
          // cell.className = "highlight"
        } else {
          const unchecked = (() => (s.selectedRows?.filter((item: string) => item != info)))()
          updateState(props._id, {selectedRows: unchecked})
          updateState(props._id, {messages: 'Row ' + info + ' unselected ---' + ' Selected Rows: ' + unchecked.toString()});
          // cell.className = "originalChakra"
        }
      }
    )
  }

  // Start of table wide functions

  // Calls python to sort on selected column(s)
  function tableSort() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "table_sort", "params": {"selected_cols": s.selectedCols}}})
  }

  //TODO Add Columns
  function addCols() {
    console.log("add column")
  }

  // TODO Once cells are dropped, remove cell highlighting
  // Calls python to drop selected column(s)
  function dropColumns() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_columns", "params": {"selected_cols": s.selectedCols}}})

    // Change all cells from highlighted class to regular
    // const cols = document.querySelectorAll("td")
    // cols.forEach((cell: any) => {
    //     cell.className = "originalChakra"
    //   }
    // )
  }

  // TODO Once cells are dropped, remove cell highlighting
  // Calls python to drop selected row(s)
  function dropRows() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_rows", "params": {"selected_rows": s.selectedRows}}})

    // Change all cells from highlighted class to regular
    // const cols = document.querySelectorAll("td")
    // cols.forEach((cell: any) => {
    //     cell.className = "originalChakra"
    //   }
    // )
  }

  // TODO Does not currently work
  function transposeTable() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "transpose_table", "params": {}}})
  }

  // Restore table to original view
  function restoreTable() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "restore_table", "params": {}}})
  }

  //Start of single column functions

  // Sort on single selected column
  function columnSort(column: any) {
    // updateState(props._id, {selectedCol: column})
    updateState(props._id,
      {executeInfo: {"executeFunc": "column_sort", "params": {"selected_col": s.selectedCol}}})
  }

  // Drop single selected column
  // Remove dropped column from selectedCols
  function dropColumn(column: any) {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_column", "params": {"selected_col": s.selectedCol}}})
    const selectedCols = s.selectedCols.filter(function (e) {
      return e !== column
    })
    updateState(props._id, {selectedCols: selectedCols})
    updateState(props._id, {messages: ""})

  }

  // Search function that replaces view. Need to keep track of table view states so table doesn't need to restore between each search
  function enterSearch(ev: any, col: string) {
    if (ev.key === "Enter") {
      const value = ev.currentTarget.value;
      setFilterInput(value)
      updateState(props._id, {
        executeInfo: {
          "executeFunc": "filter_rows",
          "params": {"filter_input": value, "col": col}
        }
      })
    }
  }

  return (
    <AppWindow app={props}>

      <>
        <div className="URL-Container" style={{display: headers.length !== 0 ? "block" : "none"}}>

          <div className="searchContainer">
            {/*<HStack display="flex" wrap="wrap" justifyContent="space-between" marginTop="1em">*/}
            {headers?.map((col: string, index: number) => (
              <div className="card">
                <label htmlFor={col}>{col}</label>
                <input type="text"
                       id={col}
                       className="search"
                       onKeyDown={(e: React.FormEvent<HTMLInputElement>) => enterSearch(e, col)}
                />
              </div>
            ))}
          </div>

          <HStack
            position='absolute'
            top='35px'
            right='15px'
          >
            <Box>
              <Popover
                isOpen={isOpen}
                onOpen={onOpen}
                onClose={onClose}
                placement='right'
                closeOnBlur={false}
              >
                <PopoverTrigger>
                  <Button rightIcon={<TbWorldDownload/>}>
                    New Dataset
                  </Button>
                </PopoverTrigger>
                <PopoverContent p={5}>
                  <FocusLock returnFocus persistentFocus={true}>
                    <PopoverArrow/>
                    <PopoverCloseButton/>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Online Dataset</FormLabel>
                        <Input
                          size='md'
                          type="text"
                          value={s.dataUrl}
                          onChange={handleUrlChange}
                        />
                        <FormHelperText>Link to online dataset</FormHelperText>
                      </FormControl>
                      <ButtonGroup display='flex' justifyContent='flex-end'>
                        <Button variant='outline' onClick={onClose}>
                          Cancel
                        </Button>
                        <Button
                          variant='outline'
                          onClick={() => handleLoadData()}
                          isDisabled={s.dataUrl === undefined || s.dataUrl === "" || running ? true : false}
                        >
                          Load Data
                        </Button>
                      </ButtonGroup>
                    </Stack>
                  </FocusLock>
                </PopoverContent>
              </Popover>
            </Box>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label='Table Operations'
                icon={<GoKebabVertical/>}
                // position='absolute'
                // top='35px'
                // right='15px'
                size="md"
              />
              <Portal>
                <MenuList
                >
                  {tableColActions.map((action, key) => {
                    return (
                      <MenuItem
                        key={key}
                        onClick={action}
                      >
                        {tableColMenuNames[key]}
                      </MenuItem>
                    )
                  })
                  }
                  <MenuDivider/>
                  {tableRowActions.map((action, key) => {
                    return (
                      <MenuItem
                        key={key}
                        onClick={action}
                      >
                        {tableRowMenuNames[key]}
                      </MenuItem>
                    )
                  })
                  }
                  <MenuDivider/>
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
          </HStack>
        </div>
        <div
          style={{display: s.totalRows !== 0 ? "none" : "block"}}
          className='URL-Container'
        >
          <InputGroup size='md'>
            <Input
              type="text"
              value={s.dataUrl}
              onChange={handleUrlChange}
              placeholder={'URL here'}
            />
            <InputRightElement width='5rem'>
              <Button
                variant='outline'
                onClick={handleLoadData}
                // disabled={running}
                isDisabled={s.dataUrl === undefined || s.dataUrl === "" || running ? true : false}
              >
                Load Data
              </Button>
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

        <div style={{display: s.totalRows !== 0 ? "block" : "none"}}>
          <TableContainer>
            <Table variant="simple" className="originalChakra" width="auto" whiteSpace="nowrap" maxHeight="22rem">
              <Thead>
                <Tr>
                  <>
                    <Th className="indexColumn"/>
                    {
                      headers?.map((header: any, index: number) => (
                        <Th className="ColName">
                          <ButtonGroup colorScheme="black" display="flex" size='md'>
                            <Button
                              key={index}
                              onClick={(e) => handleColClick(header)}
                              width='100%'
                              variant='ghost'
                              border-radius='0px'
                              justifyContent='flex-start'
                            >
                              {header}
                            </Button>
                            <Menu>
                              <>
                                <MenuButton
                                  as={IconButton}
                                  aria-label='Options'
                                  size='sm'
                                  variant='link'
                                  icon={<FiChevronDown/>}
                                  right='1%'
                                  onClick={(e) => {
                                    updateState(props._id, {selectedCol: header})
                                  }}

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
                            </Menu>
                          </ButtonGroup>
                        </Th>
                      ))
                    }
                  </>
                </Tr>
              </Thead>

              <Tbody>
                {
                  data?.map((row: any, rowIndex: number) => (
                    <Tr
                      key={indices[rowIndex]}
                    >
                      <Td key={indices[rowIndex]}
                          className="indexTd"
                          onClick={(e) => handleRowClick(indices[rowIndex])}
                      >
                        {indices[rowIndex]}
                      </Td>
                      {row.map((cell: any, colIndex: number) => (
                        <Td key={colIndex}
                            data-col={headers[colIndex % headers.length].replace(/\s+/g, '')}
                            data-row={indices[rowIndex]}
                            className="originalChakra"
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

  const updateState = useAppStore((state) => state.updateState);

  // BoardInfo
  const {boardId, roomId} = useParams();

  // TODO Move to a JSON?
  // Array of function references to map through for table actions menu
  const tableColActions = [tableSort, dropColumns]
  const tableColMenuNames = ["Sort on Selected Columns", "Drop Selected Columns"]

  const tableColActs = {"Sort on Selected Columns": tableSort, "Drop Selected Columns": dropColumns}

  // Array of function references to map through for table actions menu
  const tableRowActions = [dropRows]
  const tableRowMenuNames = ["Drop Selected Rows"]

  const tableRowActs = {"Drop Selected Rows": dropRows}

  // Array of function references to map through for table actions menu
  const tableActions = [transposeTable, restoreTable]
  const tableMenuNames = ["Transpose Table", "Restore Original Table"]

  const tableActs = {"Transpose Table": transposeTable, "Restore Original Table": restoreTable}


  const assets = useAssetStore(state => state.assets);
  // Get the asset
  const [file, setFile] = useState<Asset>();
  const roomAssets = assets.filter(el => el.data.room == roomId);
  const supportedRoomAssets = roomAssets.filter(el => el.data.file.split('.').pop() === 'csv')
  const update = useAppStore((state) => state.update);

  // Calls python to sort on selected column(s)
  function tableSort() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "table_sort", "params": {"selected_cols": s.selectedCols}}})
  }

  //TODO Add Columns
  function addCols() {
    console.log("add column")
  }

  // TODO Once cells are dropped, remove cell highlighting
  // Calls python to drop selected column(s)
  function dropColumns() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_columns", "params": {"selected_cols": s.selectedCols}}})

    // Change all cells from highlighted class to regular
    // const cols = document.querySelectorAll("td")
    // cols.forEach((cell: any) => {
    //     cell.className = "originalChakra"
    //   }
    // )
  }

  // TODO Once cells are dropped, remove cell highlighting
  // Calls python to drop selected row(s)
  function dropRows() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_rows", "params": {"selected_rows": s.selectedRows}}})

    // Change all cells from highlighted class to regular
    // const cols = document.querySelectorAll("td")
    // cols.forEach((cell: any) => {
    //     cell.className = "originalChakra"
    //   }
    // )
  }

  // TODO Does not currently work
  function transposeTable() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "transpose_table", "params": {}}})
  }

  // Restore table to original view
  function restoreTable() {
    updateState(props._id,
      {executeInfo: {"executeFunc": "restore_table", "params": {}}})
  }

  //Start of single column functions

  // Sort on single selected column
  function columnSort(column: any) {
    // updateState(props._id, {selectedCol: column})
    updateState(props._id,
      {executeInfo: {"executeFunc": "column_sort", "params": {"selected_col": s.selectedCol}}})
  }

  // Drop single selected column
  // Remove dropped column from selectedCols
  function dropColumn(column: any) {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_column", "params": {"selected_col": s.selectedCol}}})
    const selectedCols = s.selectedCols.filter(function (e) {
      return e !== column
    })
    updateState(props._id, {selectedCols: selectedCols})
    updateState(props._id, {messages: ""})

  }


  function handleFileSelected(event: any) {
    const myasset = assets.find((a) => a._id === event.target.value);
    // if (myasset) {
    //   setFile(myasset);
    //   console.log('--------' + JSON.stringify(myasset))
    //   const assetId = myasset._id;
    //   updateState(props._id,
    //   {executeInfo: {"executeFunc": "load_data", "params": {"asset_id": assetId}}})
    // }
    updateState(props._id,
      {executeInfo: {"executeFunc": "load_data", "params": {"url": myasset?._id}}})
  }

  return (
    <>
      <Select placeholder='Select File' onChange={handleFileSelected}>
        {supportedRoomAssets.map(el =>
          <option value={el._id}>{el.data.originalfilename}</option>)
        }
      </Select>
      <Menu>
        <MenuButton
          as={Button}
          aria-label='Table Operations'
          rightIcon={<GoKebabVertical/>}
          variant='outline'
          iconSpacing='7rem'
          // position='absolute'
          // top='35px'
          // right='15px'

          size="md"
        >
          Table Actions
        </MenuButton>
        <Portal>
          <MenuList
          >
            {tableColActions.map((action, key) => {
              return (
                <MenuItem
                  key={key}
                  onClick={action}
                >
                  {tableColMenuNames[key]}
                </MenuItem>
              )
            })
            }
            <MenuDivider/>
            {tableRowActions.map((action, key) => {
              return (
                <MenuItem
                  key={key}
                  onClick={action}
                >
                  {tableRowMenuNames[key]}
                </MenuItem>
              )
            })
            }
            <MenuDivider/>
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
    </>
  )
}

export default {AppComponent, ToolbarComponent};

// Convert the csv to an array using the csv-parse library
async function csvToArray(str: string): Promise<Record<string, string>[]> {
  // use the csv parser library to parse the csv
  return new Promise((resolve) => {
    parse(
      str,
      {
        relax_quotes: true,
        columns: true,
        skip_empty_lines: true,
        rtrim: true,
        trim: true,
        // delimiter: ",",
      },
      function (err, records) {
        const data = records as Record<string, string>[];
        // return the array
        return resolve(data);
      }
    );
  });
}
