import { Reaction } from "mobx"

/**
 * Closely based on autorunAsync but with difference that the first execution
 * happens synchronously. This allows `delayedComputed` to have a simpler
 * type signature: the value is never `undefined`.
 * 
 * @param func The function to execute in reaction
 * @param delay The minimum delay between executions
 * @param name (optional) For MobX debug purposes
 */
export function autorunThrottled(func: () => void, delay: number, name?: string): () => void {
    if (!name) {
        name = "autorunThrottled";
    }
    let isScheduled = false, isStarted = false;
    const r = new Reaction(name, () => {
        if (!isStarted) {
            isStarted = true;
            r.track(func);            
        } else if (!isScheduled) {
            isScheduled = true;
            setTimeout(() => {
                isScheduled = false;
                if (!r.isDisposed) {
                    r.track(func);
                }
            }, delay || 1);
        }
    });
    r.runReaction();
    return r.getDisposer();
}
