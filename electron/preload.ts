import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('desk', {
  pickProjectDir: (): Promise<unknown> => ipcRenderer.invoke('project:pick'),
  restoreProject: (): Promise<unknown> => ipcRenderer.invoke('project:restore'),
  listProjects: (): Promise<unknown> => ipcRenderer.invoke('project:list'),
  createProject: (path: string): Promise<unknown> => ipcRenderer.invoke('project:create', path),
  openProject: (id: string): Promise<unknown> => ipcRenderer.invoke('project:open', id),
  forgetProject: (id: string): Promise<void> => ipcRenderer.invoke('project:forget', id),
  repathProject: (id: string, path: string): Promise<unknown> =>
    ipcRenderer.invoke('project:repath', id, path),
  startAgent: (id: string, prompt: string, config: unknown, files?: unknown): Promise<void> =>
    ipcRenderer.invoke('agent:start', id, prompt, config, files),
  authStatus: (): Promise<unknown> => ipcRenderer.invoke('auth:status'),
  listAgentDefs: (): Promise<unknown> => ipcRenderer.invoke('agents:list'),
  writeAgentDef: (draft: unknown): Promise<unknown> => ipcRenderer.invoke('agents:write', draft),
  removeAgentDef: (name: string): Promise<void> => ipcRenderer.invoke('agents:remove', name),
  replaceAgentDef: (draft: unknown, previousName: string): Promise<unknown> =>
    ipcRenderer.invoke('agents:replace', draft, previousName),
  appVersion: (): Promise<unknown> => ipcRenderer.invoke('app:version'),
  readSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:read'),
  writeSettings: (next: unknown): Promise<unknown> => ipcRenderer.invoke('settings:write', next),
  pickKnowledge: (): Promise<unknown> => ipcRenderer.invoke('agents:pickKnowledge'),
  authoredAgents: (): Promise<string[]> => ipcRenderer.invoke('agents:authored'),
  nudge: (title: string, body: string): void => ipcRenderer.send('nudge:show', title, body),
  pickFiles: (): Promise<unknown> => ipcRenderer.invoke('files:pick'),
  // Resolving a dropped or pasted file is the one moment main can tell the path
  // came from the OS and not from the page, so the read side is told here.
  // A synthetic File resolves to '', which stays unadmitted.
  pathForFile: (file: File): string => {
    const path = webUtils.getPathForFile(file)
    if (path.length > 0) void ipcRenderer.invoke('files:admit', path)
    return path
  },
  readFiles: (paths: string[]): Promise<unknown> => ipcRenderer.invoke('files:read', paths),
  pluginCatalog: (): Promise<unknown> => ipcRenderer.invoke('plugins:catalog'),
  pluginAvailable: (): Promise<unknown> => ipcRenderer.invoke('plugins:available'),
  marketplaces: (): Promise<unknown> => ipcRenderer.invoke('plugins:marketplaces'),
  pluginAct: (verb: string, target: string, scope?: string): Promise<unknown> =>
    ipcRenderer.invoke('plugins:act', verb, target, scope),
  listChats: (project: string): Promise<unknown> => ipcRenderer.invoke('transcript:list', project),
  readTranscript: (project: string, id: string): Promise<unknown> =>
    ipcRenderer.invoke('transcript:read', project, id),
  writeTranscript: (project: string, saved: unknown): Promise<void> =>
    ipcRenderer.invoke('transcript:write', project, saved),
  forgetTranscript: (project: string, id: string): Promise<void> =>
    ipcRenderer.invoke('transcript:forget', project, id),
  login: (): Promise<unknown> => ipcRenderer.invoke('auth:login'),
  logout: (): Promise<unknown> => ipcRenderer.invoke('auth:logout'),
  onAuthProgress: (listener: (line: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, line: string): void => listener(line)
    ipcRenderer.on('auth:progress', handler)
    return () => ipcRenderer.removeListener('auth:progress', handler)
  },
  sendToAgent: (id: string, text: string, files?: unknown): void =>
    ipcRenderer.send('agent:send', id, text, files),
  stopAgent: (id: string): void => ipcRenderer.send('agent:stop', id),
  respondPermission: (id: string, requestId: string, result: unknown): void =>
    ipcRenderer.send('agent:permission', id, requestId, result),
  onAgentEvent: (listener: (event: unknown) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: unknown): void => listener(payload)
    ipcRenderer.on('agent:event', handler)
    return () => ipcRenderer.removeListener('agent:event', handler)
  },
  probeSession: (config: unknown): Promise<unknown> => ipcRenderer.invoke('session:probe', config),
  keptUsage: (): Promise<unknown> => ipcRenderer.invoke('usage:kept'),
  addConnector: (draft: unknown, taken: unknown): Promise<unknown> =>
    ipcRenderer.invoke('connectors:add', draft, taken),
  importConnectors: (): Promise<unknown> => ipcRenderer.invoke('connectors:import'),
  listConnectors: (): Promise<unknown> => ipcRenderer.invoke('connectors:list'),
  connectorAct: (verb: string, target: string): Promise<unknown> =>
    ipcRenderer.invoke('connectors:act', verb, target),
  sessionUsage: (): Promise<unknown> => ipcRenderer.invoke('session:usage'),
  latestCliVersion: (): Promise<unknown> => ipcRenderer.invoke('cli:latest'),
  runCliUpdate: (): Promise<unknown> => ipcRenderer.invoke('cli:update'),
  installCli: (): Promise<unknown> => ipcRenderer.invoke('cli:install'),
  updaterState: (): Promise<unknown> => ipcRenderer.invoke('updater:state'),
  updaterRestart: (): Promise<void> => ipcRenderer.invoke('updater:restart'),
  onUpdaterReady: (listener: (version: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, version: string): void => listener(version)
    ipcRenderer.on('updater:ready', handler)
    return () => ipcRenderer.removeListener('updater:ready', handler)
  },
})
