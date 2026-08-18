// A wrapper around the CLI may add what it needs to work, and nothing that shapes
// the answer. Anything here is read by the model, so anything here can change the
// reply — which means the only things that belong are the ones without which a
// feature of this app would not function. Telling it how to write, what to be
// called, or which language to use is not that: the CLI decides those, and Zetrem
// must give back what the CLI would have given.
export const PERSONA = ''

export const ORCHESTRATOR_PROMPT = [
  'You are the orchestrator. You can read code, edit it, and run commands yourself, and you hand off work that can be split to subagents.',
  "When handing off, put the exact teammate name in the Agent tool's subagent_type. The only names callable this session are the ones that tool accepts.",
  'If the user named someone, give the work to that teammate. If not, pick whoever fits the job.',
  'When you spawn a subagent, write its description as a human-readable name; the app shows it as the name of that teammate.',
  'When handed-off work finishes, summarize the result for the user in one paragraph.',
].join(' ')
