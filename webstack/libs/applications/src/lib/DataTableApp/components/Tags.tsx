import {
    HStack,
    Tag,
    TagLabel,
    TagLeftIcon,
    TagRightIcon,
    TagCloseButton,
} from '@chakra-ui/react'

import './styles.css'

interface Props{
    data:any;
}


export const Tags = ({data}:Props) => {

    return (
        <HStack spacing={4}>
            {['filter1', 'filter2', 'filter3', 'filter4', 'filter5'].map((tags) => (
                <Tag
                    size='md'
                    key='md'
                    borderRadius='full'
                    variant='solid'
                    colorScheme='green'
                >
                    <TagLabel>{tags}</TagLabel>
                    <TagCloseButton />
                </Tag>
            ))}
        </HStack>
    )
}