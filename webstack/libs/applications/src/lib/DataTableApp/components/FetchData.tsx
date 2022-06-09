import React, {useEffect, useState} from "react";
import {
    Input,
} from '@chakra-ui/react'

import './styles.css'

interface Props{
    url:any;
}

export const FetchData = ({url}:Props) =>  {
    const [items, setItems] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch(
            "https://jsonplaceholder.typicode.com/users")
            .then((res) => res.json())
            .then((json) => {
                setItems(json);
                setLoaded(true)
            })
        }
    )

    return (
        <div>
            {!loaded ? <h1>Not loaded</h1>:<h1>Loaded</h1>}
            <Input placeholder={'Fetch data from API'}/>  {
            items.map((item) => (
                <ol key = { item.id } >
                    headerNames = { item.keys }

                    User_Name: { item.username },
                    Full_Name: { item.name },
                    User_Email: { item.email }
                </ol>
            ))
        }
        </div>

    )
}