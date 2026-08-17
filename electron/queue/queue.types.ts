export type Queue = <T>(work: () => Promise<T>) => Promise<T>
