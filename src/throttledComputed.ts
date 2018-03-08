import { createAtom } from "./mobxShim";
import { autorunThrottled } from "./autorunThrottled";

/**
 * Like computed, except that after creation, subsequent re-evaluations
 * are throttled to occur at the specified minimum interval.
 * 
 * @param compute The function to evaluate in reaction
 * @param delay The minimum delay between evaluations
 * @param name (optional) For MobX debug purposes
 */
export function throttledComputed<T>(compute: () => T, delay: number, name?: string) {
    "use strict";

    let monitor: undefined | (() => void);
    let latestValue: T | undefined;
    let latestError: any;

    function wake() {
        sleep();
        monitor = autorunThrottled(observe, delay, name);
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
    
            return latestValue!;        
        },
        refresh() {
            wake();
        }
    }
}

