import * as test from "blue-tape";
import { useStrict } from "mobx"
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
