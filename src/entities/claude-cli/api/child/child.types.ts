type TaskState = 'pending' | 'running' | 'completed' | 'failed' | 'killed' | 'paused'

export type ChildTurnEvent =
  | {
      type: 'childOpen'
      toolUseId: string
      label: string
      subagentType: string
      prompt: string
      background: boolean
    }
  | { type: 'childSay'; toolUseId: string; role: 'user' | 'assistant'; text: string }
  | { type: 'childStream'; toolUseId: string; callId: string; line: string }
  | {
      // The CLI carries a teammate-to-teammate message only in the sender's tool call: the
      // agent on the other end is woken without ever being handed the words.
      type: 'childSent'
      toolUseId: string
      callId: string
      to: string
      message: string
    }
  | {
      type: 'childCallDone'
      toolUseId: string
      callId: string
      failed: boolean
      text: string
    }
  | { type: 'childClosed'; toolUseId: string; error?: string }
  | {
      type: 'childStarted'
      toolUseId: string | null
      taskId: string
      taskType: string
      description: string
    }
  | {
      type: 'childNotified'
      toolUseId: string | null
      taskId: string
      summary: string
      done: boolean
    }
  | {
      type: 'childProgress'
      toolUseId: string | null
      taskId: string
      doing: string
      lastTool: string
      tokens: number | null
    }
  | {
      type: 'childStateKnown'
      toolUseId: string | null
      taskId: string
      state: TaskState
      error: string
    }

export type Task = { toolUseId: string | null; taskId: string }
