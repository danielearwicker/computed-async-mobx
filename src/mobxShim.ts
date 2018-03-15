const mobx = require("mobx");

import { Atom } from "mobx";

export const useStrict: (s: boolean) => void = mobx.configure ?  
                      	(s => mobx.configure({ enforceActions: s })) : mobx.useStrict


export type CreateAtom = (name: string, onBecomeObservedHandler?: () => void, onBecomeUnobservedHandler?: () => void) => Atom;

export const createAtom: CreateAtom = mobx.createAtom ||
                        ((name, on, off) => new mobx.Atom(name, on, off));

export interface GlobalState {
    trackingDerivation: boolean;
}

export const getGlobalState = mobx._getGlobalState || mobx.extras.getGlobalState;
