/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { AppSchema } from "../schema";

import { state as AppState } from "./index";
import './styles.css';

import { Tags } from "./components/Tags"
import { DataViz } from "./components/DataViz"
import { MessageCenter } from "./components/MessageCenter"
import * as React from "react";
import {useState} from "react";

export function DataTableApp(props: AppSchema): JSX.Element {

    const s = props.state as AppState;

    const updateState = useAppStore(state => state.updateState);
    const deleteApp = useAppStore(state => state.delete);

    const [tags, setTags] = useState<any>([]);
    const [messages, setMessages] = useState<any>('...')
    

    function handleClose() {
    deleteApp(props.id);
    }

    return (
    <div className="Table-Container">
        <h3>{props.name} - <button onClick={handleClose}>X</button></h3>

        <div className="Subcomponent-Container">
            <Tags tags={tags} setMessages={setMessages}/>
        </div>

        <DataViz setTags={setTags} setMessages={setMessages}/>

        <div className="Message-Container">
            <MessageCenter messages={messages}/>
        </div>

    </div>
    )
}

export default DataTableApp;