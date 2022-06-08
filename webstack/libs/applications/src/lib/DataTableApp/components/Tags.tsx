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
                <Tag
                    size='md'
                    key='md'
                    borderRadius='full'
                    variant='solid'
                    colorScheme='green'
                >
                    <TagLabel>Green</TagLabel>
                    <TagCloseButton />
                </Tag>
        </HStack>
    )
}