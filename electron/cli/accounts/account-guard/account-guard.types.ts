// Every claude this app spawned, told to stop and seen to go. Asked by the part
// of an operation that is about to write credentials, and run once per
// operation however many times it is asked.
export type StopChildren = () => Promise<boolean>
