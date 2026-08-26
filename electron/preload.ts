import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { DeskBridge } from '@/app/desk/desk'
import type {
  Invoke,
  InvokeChannel,
  Listen,
  PushChannel,
  Send,
  SendChannel,
} from '@/app/desk/desk.types'

// Three ways across the bridge, each typed by the channel it names. The
// contract itself lives in desk.types.ts; this file only wires names to it.
function invoke<C extends InvokeChannel>(channel: C): Invoke<C> {
  return (...args) => ipcRenderer.invoke(channel, ...args)
}

function send<C extends SendChannel>(channel: C): Send<C> {
  return (...args) => ipcRenderer.send(channel, ...args)
}

function listen<C extends PushChannel>(channel: C): Listen<C> {
  return (listener) => {
    const handler = (_event: IpcRendererEvent, payload: unknown): void =>
      listener(payload as Parameters<typeof listener>[0])
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}

const desk: DeskBridge = {
  appVersion: invoke('app:version'),

  pickProjectDir: invoke('project:pick'),
  restoreProject: invoke('project:restore'),
  listProjects: invoke('project:list'),
  createProject: invoke('project:create'),
  openProject: invoke('project:open'),
  forgetProject: invoke('project:forget'),
  repathProject: invoke('project:repath'),

  startAgent: invoke('agent:start'),
  sendToAgent: send('agent:send'),
  stopAgent: send('agent:stop'),
  respondPermission: send('agent:permission'),
  onAgentEvent: listen('agent:event'),

  probeSession: invoke('session:probe'),
  sessionUsage: invoke('session:usage'),
  keptUsage: invoke('usage:kept'),

  authStatus: invoke('auth:status'),
  login: invoke('auth:login'),
  logout: invoke('auth:logout'),
  onAuthProgress: listen('auth:progress'),

  listAgentDefs: invoke('agents:list'),
  writeAgentDef: invoke('agents:write'),
  removeAgentDef: invoke('agents:remove'),
  replaceAgentDef: invoke('agents:replace'),
  pickKnowledge: invoke('agents:pickKnowledge'),
  authoredAgents: invoke('agents:authored'),

  readSettings: invoke('settings:read'),
  writeSettings: invoke('settings:write'),

  pickFiles: invoke('files:pick'),
  readFiles: invoke('files:read'),
  // Resolving a dropped or pasted file is the one moment main can tell the path
  // came from the OS and not from the page, so the read side is told here.
  // A synthetic File resolves to '', which stays unadmitted. The admit is
  // awaited, or a read that follows straight after could beat it there.
  pathForFile: async (file) => {
    const path = webUtils.getPathForFile(file)
    if (path.length > 0) await invoke('files:admit')(path)
    return path
  },

  pluginCatalog: invoke('plugins:catalog'),
  pluginAvailable: invoke('plugins:available'),
  marketplaces: invoke('plugins:marketplaces'),
  pluginAct: invoke('plugins:act'),

  listConnectors: invoke('connectors:list'),
  connectorAct: invoke('connectors:act'),
  addConnector: invoke('connectors:add'),
  importConnectors: invoke('connectors:import'),

  listChats: invoke('transcript:list'),
  readTranscript: invoke('transcript:read'),
  writeTranscript: invoke('transcript:write'),
  forgetTranscript: invoke('transcript:forget'),

  nudge: send('nudge:show'),

  latestCliVersion: invoke('cli:latest'),
  runCliUpdate: invoke('cli:update'),
  installCli: invoke('cli:install'),

  updaterState: invoke('updater:state'),
  updaterRestart: invoke('updater:restart'),
  onUpdaterReady: listen('updater:ready'),
}

contextBridge.exposeInMainWorld('desk', desk)
