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

import {useAppStore} from '@sage3/frontend';
import {App} from "../../schema";

import {state as AppState} from "./index";
import {AppWindow} from '../../components';
import './styles.css';

import React, {useState, useEffect, useMemo} from 'react';
// import {ColumnMenu} from "./components/ColumnMenu";
import {colMenus} from "./colMenus";

// const TextInput = (props: App): JSX.Element => {
//   const s = props.data.state as AppState;
//   const updateState = useAppStore(state => state.updateState);
//
//   return (
//     <FormControl>
//       <FormLabel>Online Dataset</FormLabel>
//         <InputGroup size='md'>
//           <Input
//             type="text"
//             value={s.dataUrl}
//             onChange={handleUrlChange}
//           />
//           <InputRightElement width='5rem'>
//             <Button variant='outline' onClick={handleLoadData} disabled={running}>Load Data</Button>
//           </InputRightElement>
//         </InputGroup>
//     </FormControl>
//   )
// })

// const Form = (props: App): JSX.Element => {
//   return (
//     <Stack spacing={4}>
//       <FormControl>
//       <FormLabel>Online Dataset</FormLabel>
//         <Input
//           size='md'
//           type="text"
//           value={s.dataUrl}
//           onChange={handleUrlChange}
//         />
//       </FormControl>
//       <ButtonGroup display='flex' justifyContent='flex-end'>
//         <Button variant='outline' onClick={onCancel}>
//           Cancel
//         </Button>
//         <Button variant='outline' onClick={handleLoadData} disabled={running}>Load Data</Button>
//       </ButtonGroup>
//     </Stack>
//   )
// }

// const PopoverForm = (props: App): JSX.Element => {
//   const {onOpen, onClose, isOpen} = useDisclosure()
//   // const firstFieldRef = React.useRef(null)
//
//   const s = props.data.state as AppState;
//   const updateState = useAppStore(state => state.updateState);
//
//   return (
//     <>
//       <Popover
//         isOpen={isOpen}
//         onOpen={onOpen}
//         onClose={onClose}
//         placement='right'
//         closeOnBlur={false}
//       >
//         <PopoverTrigger>
//           <Button rightIcon={<TbWorldDownload/>}>
//             New Dataset
//           </Button>
//         </PopoverTrigger>
//         <PopoverContent p={5}>
//           <FocusLock returnFocus persistentFocus={true}>
//             <PopoverArrow/>
//             <PopoverCloseButton/>
//             <Stack spacing={4}>
//               <FormControl>
//                 <FormLabel>Online Dataset</FormLabel>
//                 <Input
//                   size='md'
//                   type="text"
//                   value={s.dataUrl}
//                   onChange={this.props.handleUrlChange}
//                 />
//                 <FormHelperText>Link to online dataset</FormHelperText>
//               </FormControl>
//               <ButtonGroup display='flex' justifyContent='flex-end'>
//                 <Button variant='outline' onClick={onClose}>
//                   Cancel
//                 </Button>
//                 <Button variant='outline' onClick={() => props.handleLoadData()}>Load Data</Button>
//               </ButtonGroup>
//             </Stack>
//           </FocusLock>
//         </PopoverContent>
//       </Popover>
//     </>
//   )
// }

// const Input = (props: App) : JSX.Element => {
//   const s = props.data.state as AppState;
//   const updateState = useAppStore(state => state.updateState);
//
//   function handleKeyDown(e) {
//     if (e.key == 'Enter') {
//       props.data.state.
//     }
//   }
//
//   return()
// }


const Pagination = (props: App): JSX.Element => {

  const s = props.data.state as AppState;
  const updateState = useAppStore(state => state.updateState);

  const [leftButtonDisable, setLeftButtonDisable] = useState(true)
  const [rightButtonDisable, setRightButtonDisable] = useState(true)
  const [pageNumbers, setPageNumbers] = useState([0])


  const rowsPerPageArr = useMemo(() => {
    const rowDisplayOptions = []
    const minRows = 1
    const maxRows = 10

    for (let i = minRows; i <= maxRows; i++) {
      rowDisplayOptions.push(i)
    }
    return (rowDisplayOptions)
  }, [])


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

  const handleRowDisplayCount = (rows: number) => {
    updateState(props._id, {rowsPerPage: rows})
    updateState(props._id, {executeInfo: {"executeFunc": "paginate", "params": {}}})
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
    console.log("pagination useEffect")
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

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  // Client local states
  const [data, setData] = useState([])
  const [headers, setHeaders] = useState([])
  const [indices, setIndices] = useState([])
  const [running, setRunning] = useState((s.executeInfo.executeFunc === "") ? false : true)
  const [filterInput, setFilterInput] = useState('')

  const {onOpen, onClose, isOpen} = useDisclosure()

  // Array of function references to map through for table actions menu
  const tableColActions = [tableSort, dropColumns]
  const tableColMenuNames = ["Sort on Selected Columns", "Drop Selected Columns"]

  // Array of function references to map through for table actions menu
  const tableRowActions = [dropRows]
  const tableRowMenuNames = ["Drop Selected Rows"]

  // Array of function references to map through for table actions menu
  const tableActions = [transposeTable, restoreTable]
  const tableMenuNames = ["Transpose Table", "Restore Original Table"]

  // Array of function references to map through for column actions menu
  const columnActions = [columnSort, dropColumn]
  const columnMenuNames = ["Sort on Column", "Drop Column"]


  function handleLoadData() {
    console.log("in handleLoadData and updating the executeInfo")
    setRunning(true)
    updateState(props._id,
      {executeInfo: {"executeFunc": "load_data", "params": {"url": s.dataUrl}}})
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

  useEffect(() => {
    const colDifference = headers.filter(x => !s.selectedCols.includes(x));
    colDifference.forEach((col) => {
      const cols = document.querySelectorAll("td[data-col='" + col + "']")
      cols.forEach((cell: any) => {
          cell.className = "originalChakra"
        }
      )
    })
    s.selectedCols.forEach((col) => {
      const cols = document.querySelectorAll("td[data-col='" + col + "']")
      cols.forEach((cell: any) => {
          cell.className = "highlight"
        }
      )
    })
    console.log("TWO ARRAYS selectedCols useEffect")
  }, [JSON.stringify(s.selectedCols), indices.length])

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
    console.log("TWO ARRAYS selectedRows useEffect")
  }, [JSON.stringify(s.selectedRows)])

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

  function handleRowClick(info: number) {
    const infoString = info.toString()
    const row = document.querySelectorAll("td[data-row='" + infoString + "']")
    row.forEach((cell: any) => {
        if (!s.selectedRows?.includes(infoString)) {
          const checked = s.selectedRows.concat(infoString)
          updateState(props._id, {selectedRows: checked})
          updateState(props._id, {messages: 'Row ' + infoString + ' selected ---' + ' Selected Rows: ' + checked.toString()});
          // cell.className = "highlight"
        } else {
          const unchecked = (() => (s.selectedRows?.filter((item: string) => item != infoString)))()
          updateState(props._id, {selectedRows: unchecked})
          updateState(props._id, {messages: 'Row ' + info + ' unselected ---' + ' Selected Rows: ' + unchecked.toString()});
          // cell.className = "originalChakra"
        }
      }
    )
    console.log("row " + infoString + " clicked")
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
    //
    // const cols = document.querySelectorAll("td")
    // cols.forEach((cell: any) => {
    //     cell.className = "originalChakra"
    //   }
    // )
  }

  function dropRows() {
    console.log("Dropping rows: " + s.selectedRows)
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_rows", "params": {"selected_rows": s.selectedRows}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
    //
    // const cols = document.querySelectorAll("td")
    // cols.forEach((cell: any) => {
    //     cell.className = "originalChakra"
    //   }
    // )
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
    // updateState(props._id, {selectedCol: column})
    console.log("Sorting on " + s.selectedCol)
    updateState(props._id,
      {executeInfo: {"executeFunc": "column_sort", "params": {"selected_col": s.selectedCol}}})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  function dropColumn(column: any) {
    updateState(props._id,
      {executeInfo: {"executeFunc": "drop_column", "params": {"selected_col": s.selectedCol}}})
    const selectedCols = s.selectedCols.filter(function (e) {
      return e !== column
    })
    updateState(props._id, {selectedCols: selectedCols})
    updateState(props._id, {messages: ""})
    console.log(s.executeInfo)
    console.log("----")
    console.log(s)
  }

  // function handleFilterInput(ev: React.FormEvent<HTMLInputElement>, col: string) {
  //   const value = ev.currentTarget.value;
  //   console.log(col)
  //   console.log(typeof col)
  //   setFilterInput(value)
  //   updateState(props._id,{executeInfo: {"executeFunc": "filter_rows", "params": {"filter_input": value, "col": col}}})
  // }

  function enterSearch(ev: any, col: string) {
    if (ev.key === "Enter") {
      const value = ev.currentTarget.value;
      console.log(col)
      console.log(typeof col)
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
          <p>s.selectedRows: {s.selectedRows}</p>
          <p>s.selectedCols: {s.selectedCols}</p>

          <HStack>
            {headers?.map((col: string, index: number) => (
              <>
                <p>{col}</p>
                <input type="text"
                       className="search"
                       onKeyDown={(e: React.FormEvent<HTMLInputElement>) => enterSearch(e, col)}
                />
                {/*<Input*/}
                {/*  // value={filterInput}*/}
                {/*  // onChange={(e: React.FormEvent<HTMLInputElement>) => handleFilterInput(e, col)}*/}
                {/*  onSubmit={}*/}
                {/*  size='sm'*/}
                {/*/>*/}
              </>
            ))}
          </HStack>

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
          <TableContainer overflowY="auto" display="flex" maxHeight="300px">
            <Table colorScheme="facebook" variant='simple' size="md" className="originalChakra">
              <Thead>
                <Tr>
                  <>
                    <Th className="indexColumn"/>
                    {
                      headers?.map((header: any, index: number) => (
                        <Th className="ColName">
                          <ButtonGroup colorScheme="black" display="flex" size='sm'>
                            <Button
                              key={index}
                              onClick={(e) => handleColClick(header)}
                              width='80%'
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
                            data-col={headers[colIndex % headers.length]}
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

  return (
    <>
    </>
  )
}

export default {
  AppComponent, ToolbarComponent
}
;
