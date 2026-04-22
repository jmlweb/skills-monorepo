export declare const ADJECTIVES: readonly ["brave", "calm", "cool", "fast", "happy", "kind", "loud", "nice", "quick", "warm", "wild", "wise"];
export declare const NOUNS: readonly ["ants", "bees", "cats", "dogs", "eels", "fish", "goats", "hawks", "jays", "lions"];
export declare const VERBS: readonly ["dance", "fly", "grow", "hide", "jump", "kick", "leap", "march", "play", "rest", "sing", "walk"];
export type NameRandom = () => number;
export type AvailabilityCheck = (name: string) => boolean;
export declare function generateChangesetName(random?: NameRandom): string;
export declare function generateUniqueChangesetName(isAvailable: AvailabilityCheck, random?: NameRandom, maxAttempts?: number): string;
export declare function listChangesetNames(cwd: string, dir: string): Set<string>;
