import { createAtom } from "./mobxShim";
import { autorun } from "mobx";

/**
 * Like `computed`, except that after creation, subsequent re-evaluations
 * are throttled to occur at the specified minimum interval.
 * 
 * @param compute The function to evaluate in reaction
 * @param delay The minimum delay between evaluations
 * @param name (optional) For MobX debug purposes
 */
export function throttledComputed<T>(init: T, delay: number, compute: () => T, name?: string) {
    "use strict";

    let monitor: undefined | (() => void);
    let latestValue = init;
    let latestError: any;

    function wake() {        
        sleep();
        monitor = autorun(observe, { delay, name: name || "throttledComputed" });
    }

    function observe(): void {
        try {
            const newValue = compute();
            if (latestError || newValue !== latestValue) {
                latestValue = newValue;
                latestError = undefined;
                atom.reportChanged();
            }
        } catch (x) {
            latestError = x;
            atom.reportChanged();
        }
    }

    function sleep() {
        const dispose = monitor;
        monitor = undefined;

        if (dispose) {
            dispose();
        }
    }

    const atom = createAtom(name || "DelayedComputedAtom", wake, sleep);

    return {
        get() {
            atom.reportObserved();
    
            if (latestError) {
                throw latestError;
            }
    
            return latestValue;
        },
        refresh() {
            wake();
        }
    }
}

