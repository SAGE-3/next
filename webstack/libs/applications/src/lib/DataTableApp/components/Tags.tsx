import {
    Checkbox,
    CheckboxGroup,
    HStack,
    Switch,
    Tag,
    TagLabel,
    TagCloseButton,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";

// interface Props{
//     data:any;
// }


export const Tags = (props: any) => {

    const tags = props.tags;

    function handleChange(info: any) {
        console.log(info + ' tag selected')
    }

    return (
        <div>
            {/*<HStack spacing='4'>*/}
            {/*    {['filter1', 'filter2', 'filter3', 'filter4', 'filter5'].map((tags) => (*/}
            {/*        <Tag*/}
            {/*            size='md'*/}
            {/*            key='md'*/}
            {/*            borderRadius='full'*/}
            {/*            variant='solid'*/}
            {/*            colorScheme='green'*/}
            {/*        >*/}
            {/*            <TagLabel>{tags}</TagLabel>*/}
            {/*            <TagCloseButton />*/}
            {/*        </Tag>*/}
            {/*    ))}*/}
            {/*</HStack>*/}
            <CheckboxGroup colorScheme='green'>
                <HStack spacing='4' display='flex'>
                    {tags.map((tag: any) => (
                        <Checkbox value={tag} onChange={(e) => handleChange(tag)}>{tag}</Checkbox>
                    ))}
                </HStack>
            </CheckboxGroup>
        </div>

    )
}