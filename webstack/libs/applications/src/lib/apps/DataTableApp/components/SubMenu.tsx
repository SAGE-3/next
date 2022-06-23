import {
    Button, Menu, MenuButton, IconButton, MenuList, MenuItem, Portal,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";
import {FiChevronDown, FiChevronRight} from "react-icons/fi";

import { colMenus } from "../colMenus";
import {forwardRef} from "react";

// interface Props{
//     data:any;
// }


export const SubMenu = () => {

    return (
        <Menu>
            {colMenus.map((data, key) => {
                return (
                    <MenuItem key={key}>
                        <MenuButton>
                            {data.type}
                            <MenuList mt='5px'>
                                {data.actions.map((vals, index) => {
                                    return (
                                        <MenuItem>{vals}</MenuItem>
                                    )
                                })
                                }
                            </MenuList>
                        </MenuButton>
                    </MenuItem>
                )
            })
            }
        </Menu>
    )
}