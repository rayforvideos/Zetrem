export type Translated = { description: string; body: string }
export type RunPrompt = (prompt: string) => Promise<string>
