import {
    Button, Menu, MenuButton, IconButton, MenuList, MenuItem,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";
import {FiChevronDown, FiChevronRight} from "react-icons/fi";
import {useEffect} from "react";

// interface Props{
//     data:any;
// }


export const ColumnMenu = () => {

    function getData() {
        fetch(
            '../colMenus.json')
            .then((res) => res.json())
            .then((json) => {
                console.log(json)
            })
    }

    function handleChange(info: any) {
        console.log(info + ' tag selected')
    }

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
                    <MenuItem onClick={() => getData()}>
                        Option 1
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
                    </MenuItem>
                    <MenuItem>Option 2</MenuItem>
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