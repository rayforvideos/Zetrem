// How a login child came to be over: on its own, or because the person called
// it off. The operation around it tells the two apart when it says what
// became of the sign-in.
export type LoginEnd = 'ended' | 'cancelled'
