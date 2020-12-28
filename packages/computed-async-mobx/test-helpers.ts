import { useStrict, makeObservable } from "./src/mobxShim";
import { observable, runInAction } from "mobx"

export function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export function testCombinations(
    description: string,
    script: (delayed: boolean) => Promise<void>
) {
    for (const delayed of ([true, false])) {
        testStrictness(`${description}, delayed=${delayed}`, () => script(delayed));
    }
}

export function testStrictness(
    description: string,
    script: () => Promise<void>
) {
    for (const strict of [true, false]) {        
        it(`${description}, strict=${strict}`, 
            () => {
                useStrict(strict);
                return script(); 
            }
        );
    }
}

export async function waitForLength(ar: any[], length: number) {
    while (ar.length < length) {         
        await delay(5);
    }
}

export class Obs<T> {

    @observable
    v: T | undefined;

    constructor(init: T) {
        runInAction(() => this.v = init); 
        makeObservable(this, {
            v: observable
        });        
    }

    get() {
        return this.v;
    }

    set(val: T) {
        this.v = val;
    }
}
