import { testStrictness, delay } from "../test-helpers";
import { asyncComputed } from "../src/index"
import { observer } from "mobx-react";
import * as React from "react";

const mobxReact = require("mobx-react");
const clearTimers = mobxReact.clearTimers || (() => {});

require('jsdom-global')();

import * as ReactDOM from "react-dom";

function makeTestModel() {
    return {
        ac: asyncComputed(0, 10, async () => {        
            await delay(10);
            return 1;
        })        
    };
}

interface CProps {
    model: ReturnType<typeof makeTestModel>;
}

const C = observer(({model}: CProps) => <span>{model.ac.get()}</span>);

testStrictness("asyncComputed - can be used in an observer render method", async () => {

    const root = document.body.appendChild(document.createElement('div'));

    const model = makeTestModel();

    ReactDOM.render(<C model={model} />, root);

    const rendered = root.querySelector("span")!;

    expect(rendered.innerHTML).toEqual("0");

    while (rendered.innerHTML === "0") { 
        await delay(5);
    }

    expect(rendered.innerHTML).toEqual("1");

    ReactDOM.render(<div/>, root);

    clearTimers();
});
