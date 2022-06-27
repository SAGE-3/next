/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from "./index";
import { debounce } from 'throttle-debounce';
import { AppWindow } from '../../components';
import './styles.css';

import { Tags } from "./components/Tags"
import { DataViz } from "./components/DataViz"
import { MessageCenter } from "./components/MessageCenter"
import * as React from "react";
import {useEffect, useRef, useState} from "react";

function DataTableApp(props: App): JSX.Element {

    const s = props.data.state as AppState;

    const updateState = useAppStore(state => state.updateState);

    const [tags, setTags] = useState<any[]>(s.tags);
    const [messages, setMessages] = useState<any>(s.messages);

    const [inputVal, setInputVal] = useState(s.inputVal);
    const [items, setItems] = useState<any[]>(s.items);
    const [loaded, setLoaded] = useState(s.loaded);
    const [headers, setHeaders] = useState<any[]>(s.headers);
    const [clicked, setClicked] = useState(s.clicked);

    // useEffect(() => { setInputVal(s.inputVal); }, [s.inputVal]);
    // useEffect(() => { setTags(s.tags); }, [s.tags]);
    // useEffect(() => { setMessages(s.messages); }, [s.messages]);
    // useEffect(() => { setItems(s.items); }, [s.items]);
    // useEffect(() => { setHeaders(s.headers); }, [s.headers]);


    // // Saving the text after 1sec of inactivity
    // const debounceSave = debounce(1000, (val) => {
    //     updateState(props._id, { tags: val });
    // });
    // // Keep a copy of the function
    // const debounceFunc = useRef(debounceSave);

    return (
    <AppWindow app={props}>

        <>
        <div className="Subcomponent-Container">
            <Tags tags={tags} setMessages={setMessages}/>
        </div>

        <DataViz
            setTags={setTags}
            // setMessages={setMessages}
            setInputVal={setInputVal}
            inputVal={inputVal}
            setItems={setItems}
            setLoaded={setLoaded}
            setHeaders={setHeaders}
            setClicked={setClicked}
        />

        <div className="Message-Container">
            <MessageCenter messages={messages}/>
        </div>
        </>

    </AppWindow>
    )
}

export default DataTableApp;