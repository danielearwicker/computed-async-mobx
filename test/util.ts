import test from "blue-tape";
import { useStrict, makeAutoObservable } from "../src/mobxShim";
import { runInAction } from "mobx"

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
    while (ar.length < length) { 
        console.log(ar, length);
        await delay(5);
    }
}

export class Obs<T> {

    v: T | undefined = undefined;

    constructor(init: T) {
        makeAutoObservable(this);
        runInAction(() => this.v = init); 
    }

    get() {
        return this.v;
    }

    set(val: T) {
        this.v = val;
    }
}
