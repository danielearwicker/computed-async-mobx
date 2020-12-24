const mobx = require("mobx");

import { IAtom } from "mobx";

export const useStrict: (s: boolean) => void = mobx.configure ?  
                      	(s => mobx.configure({ enforceActions: s ? "always" : "never" })) : mobx.useStrict

export type CreateAtom = (name: string, onBecomeObservedHandler?: () => void, onBecomeUnobservedHandler?: () => void) => IAtom;

export const createAtom: CreateAtom = mobx.createAtom ||
                        ((name, on, off) => new mobx.Atom(name, on, off));

export interface GlobalState {
    trackingDerivation: boolean;
}

export const getGlobalState = mobx._getGlobalState || mobx.extras.getGlobalState;

export const makeObservable = mobx.makeObservable || (() => {});

export const makeAutoObservable = mobx.makeAutoObservable || (() => {});
