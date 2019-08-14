import * as test from "blue-tape";
import { useStrict } from "../src/mobxShim";
import { observable, runInAction } from "mobx"

import { delay } from "./delay";

export function testCombinations(
    description: string,
    script: (delayed: boolean, assert: test.Test) => Promise<void>
) {
    for (const delayed of ([true, false])) {
        testStrictness(`${description}, delayed=${delayed}`, 
            assert => script(delayed, assert)
        );
    } 
}

export function testStrictness(
    description: string,
    script: (assert: test.Test) => Promise<void>
) {
    for (const strict of [true, false]) {        
        test(`${description}, strict=${strict}`, 
            assert => {
                useStrict(strict);
                return script(assert); 
            }
        );
    }
}

export async function waitForLength(ar: any[], length: number) {
    while (ar.length !== length) { 
        await delay(5);
    }
}

export class Obs<T> {

    @observable v: T;

    constructor(init: T) {
        runInAction(() => this.v = init);
    }

    get() {
        return this.v;
    }

    set(val: T) {
        this.v = val;
    }
}
