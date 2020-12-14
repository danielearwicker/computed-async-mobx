require('jsdom-global')();

import test from "blue-tape";
import { testStrictness } from "./util";
import { delay } from "./delay";
import { asyncComputed } from "../src/index"
import * as React from "react";
import * as ReactDOM from "react-dom";
import { observer } from "mobx-react";

@observer
class C extends React.Component
{
    ac = asyncComputed(0, 10, async () => {        
        await delay(100);
        return 1;
    })

    render() {
        return <span>{this.ac.get()}</span>
    }
}

testStrictness("asyncComputed - can be used in an observer render method", async (assert: test.Test) => {

    const root = document.body.appendChild(document.createElement('div'));

    ReactDOM.render(<C/>, root);

    const rendered = root.querySelector("span")!;

    assert.equal(rendered.innerHTML, "0", "Initially renders 0");

    while (rendered.innerHTML === "0") { 
        await delay(5);
    }

    assert.equal(rendered.innerHTML, "1", "Transitions to 1");
});

