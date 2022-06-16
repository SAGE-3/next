import {
    Button, Menu, MenuButton, IconButton, MenuList, MenuItem, Th, Tr,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";
import {FiChevronDown, FiChevronRight} from "react-icons/fi";
import {useEffect, useState} from "react";

import { colMenus } from "../colMenus";

// interface Props{
//     data:any;
// }


export const ColumnMenu = () => {

    const [typeMenu, setTypeMenu] = useState<any[]>([]);
    const [options, setOptions] = useState<any[]>([]);



    // function handleChange(info: any) {
    //
    // }

    return (
            <Menu>
                <MenuButton
                    as={IconButton}
                    aria-label='Options'
                    size='md'
                    variant='ghost'
                    icon={<FiChevronDown/>}
                    ml='20%'

                />
                <MenuList mt='5px'>
                    <MenuItem ml='30%'>Data type:</MenuItem>
                        {colMenus.map((data, key) => {
                            return (
                                <MenuItem>{data.type}</MenuItem>
                            )
                        })
                        }

                        {/*<Menu>*/}
                        {/*    <MenuButton*/}
                        {/*        as={IconButton}*/}
                        {/*        aria-label='Options'*/}
                        {/*        size='sm'*/}
                        {/*        variant='ghost'*/}
                        {/*        icon={<h4><FiChevronRight/></h4>}*/}
                        {/*        ml='60%'*/}
                        {/*    />*/}
                        {/*    <MenuList>*/}
                        {/*        <MenuItem>Sub-Option 1</MenuItem>*/}
                        {/*    </MenuList>*/}
                        {/*</Menu>*/}
                </MenuList>
            </Menu>
        // <Menu>
        //     {({isOpen}) => (
        //         <>
        //             <MenuButton isActive={isOpen} as={Button} rightIcon={<FiChevronDown />}>
        //                 {isOpen ? 'Close' : 'Open'}
        //             </MenuButton>
        //             <MenuList>
        //                 <MenuItem>Download</MenuItem>
        //                 <MenuItem onClick={() => alert('Kagebunshin')}>Create a Copy</MenuItem>
        //             </MenuList>
        //         </>
        //     )}
        // </Menu>
    )
}