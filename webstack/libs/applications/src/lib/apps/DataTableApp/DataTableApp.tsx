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
    useCheckbox, useCheckboxGroup,
} from '@chakra-ui/react'

import { GoKebabVertical } from "react-icons/go";

import { useAppStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from "./index";
import { debounce } from 'throttle-debounce';
import { AppWindow } from '../../components';
import './styles.css';

// import { Tags } from "./components/Tags"
// import { DataViz } from "./components/DataViz"
// import { MessageCenter } from "./components/MessageCenter"
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {ColumnMenu} from "./components/ColumnMenu";

function DataTableApp(props: App): JSX.Element {

    const s = props.data.state as AppState;

    const updateState = useAppStore(state => state.updateState);

    // const [tags, setTags] = useState<any[]>(s.tags);
    const [messages, setMessages] = useState<any>(s.messages);

    const [inputVal, setInputVal] = useState(s.inputVal);
    const [items, setItems] = useState<any[]>(s.items);
    const [loaded, setLoaded] = useState(s.loaded);
    const [headers, setHeaders] = useState<any[]>(s.headers);
    const [clicked, setClicked] = useState(s.clicked);
    const [check, setCheck] = useState(s.check);
    const [style, setStyle] = useState(s.style);

    const [checkedItems, setCheckedItems] = useState(s.checkedItems)
    // const allChecked = checkedItems.every(Boolean)
    // const isIndeterminate = checkedItems.some(Boolean) && !allChecked
    // const {value, onChange, setValue, getCheckboxProps} = useCheckboxGroup({
    //     value: s.value,
    //     onChange: handleChange,
    // });

    // const { state, getCheckboxProps, getInputProps, getLabelProps, htmlProps } = useCheckbox(props)

    // useEffect(() => { setInputVal(s.inputVal); }, [s.inputVal]);
    // // useEffect(() => { setTags(s.tags); }, [s.tags]);
    // useEffect(() => { setMessages(s.messages); }, [s.messages]);
    // useEffect(() => { setItems(s.items); }, [s.items]);
    // useEffect(() => { setHeaders(s.headers); }, [s.headers]);
    // useEffect(() => { setLoaded(s.loaded); }, [s.loaded]);
    // useEffect(() => { setCheck(s.check); }, [s.check]);
    // useEffect(() => { setStyle(s.style); }, [s.style]);
    // useEffect(() => { setValue(s.value); }, [s.value]);
    // useEffect(() => { setCheckedItems(s.checkedItems); }, [s.checkedItems]);



    // // Saving the text after 1sec of inactivity
    // const debounceSaveTable = debounce(1000, (input, val, heads, load) => {
    //     updateState(props._id, { inputVal: input });
    //     updateState(props._id, { items: val });
    //     updateState(props._id, { headers: heads });
    //     updateState(props._id, { loaded: load });
    //
    // });

    // // Saving the text after 1sec of inactivity
    // const debounceSaveMessage = debounce(1000, (info) => {
    //     updateState(props._id, { messages: info });
    // });

    const debounceSaveCheck= debounce(1000, (info) => {
        updateState(props._id, { check: info });
    });

    // const debounceSaveCheckedItems= debounce(1000, (info) => {
    //     updateState(props._id, { checkedItems: info });
    // });

    const debounceSaveValue= debounce(1000, (val) => {
        // updateState(props._id, { selected: info });
        updateState(props._id, { value: val });
    });

    // // Keep a copy of the function
    // const debounceFuncTable = useRef(debounceSaveTable);

    // // Keep a copy of the function
    // const debounceFuncMessage = useRef(debounceSaveMessage);

    // Keep a copy of the function
    const debounceFuncCheck = useRef(debounceSaveCheck);

    // // Keep a copy of the function
    // const debounceFuncCheckedItems = useRef(debounceSaveCheckedItems);

    // Keep a copy of the function
    const debounceFuncValue = useRef(debounceSaveValue);


    function handleSubmit() {
        console.log(s.inputVal)
        fetch(
            s.inputVal)
            .then((res) => res.json())
            .then((json) => {
                setItems(json)
                setLoaded(true)
                setHeaders(Object.keys(json[0]))
                // debounceFuncTable.current(inputVal, json, Object.keys(json[0]), true)
                updateState(props._id, { inputVal: inputVal });
                updateState(props._id, { items: json });
                updateState(props._id, { headers: Object.keys(json[0]) });
                updateState(props._id, { loaded: true });
            })
    }

    function handleNesting(child: []) {
        if (typeof Object.keys(child) === 'object') {
            Array.from(child).forEach(element => {
                console.log(Object.keys(element))
            })
        }
        return ""
    }

    function handleCellClick(clicked: boolean) {
        setClicked(clicked)
        const cells = document.querySelectorAll('td');
        cells.forEach(cell => {
            cell.addEventListener('click', () =>
                setMessages("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")"))
                updateState(props._id, { messages: "(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")" })
                // debounceFuncMessage.current("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")")

        })
    }

    function handleChange(info: any) {
        const cols = document.querySelectorAll("td[data-col=" + info + "]")
        cols.forEach((cell: any) => {
                if (!checkedItems.includes(info)) {
                    setCheckedItems(checkedItems.concat(info))
                    // setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected')
                    updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected' });
                    // debounceFuncMessage.current((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected')
                    cell.className= "highlight"
                } else {
                    setCheckedItems((checkedItems: any[]) => checkedItems.filter((item: any) => item != info))
                    // setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected')
                    updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected' });
                    // debounceFuncMessage.current((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected')
                    cell.className = "originalChakra"

                }
            }
        )
        // debounceFuncCheckedItems.current(checkedItems.concat(info))
        updateState(props._id, { checkedItems: checkedItems.concat(info) });
        console.log(checkedItems)
    }

    // function handleChange(e: React.ChangeEvent<HTMLInputElement>, info: string) {
    //     const cols = document.querySelectorAll("td[data-col=" + info + "]")
    //     // setSelected(cols)
    //     // debounceFuncSelected.current(cols)
    //     const checked = e.target.checked
    //     console.log(e.target.value)
    //     // setCheck(checked)
    //     // debounceFuncCheck.current(checked)
    //     // debounceFuncSelected.current(cols, checked)
    //
    //     // console.log("selected: " + cols)
    //     // console.log("selected type: " + typeof(cols))
    //     //
    //     // console.log("checked: " + checked)
    //     // console.log("checked type: " + typeof(checked))
    //
    //     cols.forEach((cell: any) => {
    //             if (checked) {
    //                 setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected')
    //                 debounceFuncMessage.current((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected')
    //                 cell.className= "highlight"
    //                 setCheck(checked)
    //                 debounceFuncCheck.current(checked)
    //                 // cell.addEventListener('click', () =>
    //                 //     setStyle(cell.className)
    //                 // )
    //                 // setStyle("highlight")
    //                 // debounceFuncStyle.current("highlight")
    //                 // console.log("style: " + style)
    //                 // console.log(info)
    //             } else {
    //                 setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected')
    //                 debounceFuncMessage.current((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected')
    //                 cell.className = "originalChakra"
    //                 setCheck(checked)
    //                 debounceFuncCheck.current(checked)
    //                 // setStyle("originalChakra")
    //                 // debounceFuncStyle.current("originalChakra")
    //                 // console.log("style: " + style)
    //                 // console.log(info)
    //             }
    //         }
    //     )
    // }

    return (
    <AppWindow app={props}>

        <>
        <div className="Subcomponent-Container">
            <CheckboxGroup colorScheme='green'>
                <HStack spacing='10' display='flex' zIndex="dropdown">
                    {s.headers.map((tag: any, index: number) => (
                        <Checkbox
                            value={tag}
                            onChange={(e) => handleChange(tag)}
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
                            <MenuList>
                                <MenuItem>Console log col name</MenuItem>
                                <MenuItem>Sort</MenuItem>
                                <MenuItem>Compare</MenuItem>
                            </MenuList>
                        </Portal>
                    </Menu>
                </HStack>
            </CheckboxGroup>
        </div>
                <InputGroup size='md'>
                    {!s.loaded ? <Badge fontSize='1.5em' variant='solid' colorScheme='red'>Not loaded</Badge>:<Badge fontSize='1.5em' variant='solid' colorScheme='green'>Loaded</Badge>}
                    <Input
                        type="text"
                        value={inputVal}
                        placeholder={'URL here'}
                        onChange={(e) => setInputVal(e.target.value)}
                    />
                    <InputRightElement width='5rem'>
                        <Button variant='outline' onClick={handleSubmit}>Submit</Button>
                    </InputRightElement>
                </InputGroup>
                <TableContainer overflowY="auto" display="flex" maxHeight="300px">
                    <Table colorScheme="facebook" variant='simple' size="sm">
                        <Thead>
                            <Tr>
                                {
                                    s.headers?.map((header: any, index: number) => (
                                        <Th key={index}>
                                            {header}
                                            <ColumnMenu/>
                                        </Th>
                                    ))
                                }
                            </Tr>
                        </Thead>

                        <Tbody>
                            {
                                s.items?.map((item: any, index: number) => (
                                    <Tr key={item.id}>
                                        {Object.values(item)?.map((itemChild: any, index) => (
                                            <>
                                                {(typeof itemChild === 'object') ?<Td key={index} data-col={headers[index % headers.length] }> {handleNesting(itemChild)} </Td> : <Td key={index} data-col={headers[index % headers.length] } onClick={() => handleCellClick(!clicked)}> {itemChild} </Td>}
                                            </>
                                        ))}
                                    </Tr>
                                ))
                            }
                        </Tbody>
                    </Table>
                </TableContainer>
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

export default DataTableApp;