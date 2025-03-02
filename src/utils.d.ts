export declare const everyItem: <I = unknown>(list: I[], check?: (item: I) => boolean) => boolean;

export declare const ensureArray: <V = unknown>(value: V) => V extends undefined ? [] : V extends Array ? V : V[];
