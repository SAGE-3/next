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

export function DataTableApp(props: AppSchema): JSX.Element {

    const s = props.state as AppState;

    const updateState = useAppStore(state => state.updateState);
    const deleteApp = useAppStore(state => state.delete);


    function handleClose() {
    deleteApp(props.id);
    }

    return (
    <div className="Table-Container">
        <h3>{props.name} - <button onClick={handleClose}>X</button></h3>

        <div className="Message-Container">
            <Tags data={s.filler}/>
        </div>

        <DataViz data={s.filled}/>

        <div className="Message-Container">
            <MessageCenter data={s.filly}/>
        </div>

    </div>
    )
}

export default DataTableApp;