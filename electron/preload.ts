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
  cancelLogin: send('auth:cancel-login'),
  onAuthProgress: listen('auth:progress'),

  listAccounts: invoke('accounts:list'),
  addAccount: invoke('accounts:add'),
  switchAccount: invoke('accounts:switch'),
  reauthAccount: invoke('accounts:reauth'),
  removeAccount: invoke('accounts:remove'),

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
  nudgeState: invoke('nudge:state'),
  listMemory: invoke('memory:list'),
  readMemory: invoke('memory:read'),
  writeMemory: invoke('memory:write'),
  removeMemory: invoke('memory:remove'),
  openNotifySettings: send('nudge:settings'),

  latestCliVersion: invoke('cli:latest'),
  runCliUpdate: invoke('cli:update'),
  installCli: invoke('cli:install'),

  listLibraryNotes: invoke('library:list'),
  readLibraryNote: invoke('library:read'),
  removeLibraryNote: invoke('library:remove'),
  writeLibraryNote: invoke('library:write'),
  createLibraryNote: invoke('library:create'),
  renameLibraryNote: invoke('library:rename'),
  fileLibraryNote: invoke('library:file'),
  searchLibrary: invoke('library:search'),
  libraryBacklinks: invoke('library:backlinks'),
  onLibraryChanged: listen('library:changed'),
  addLibraryFolder: invoke('library:folder-add'),
  renameLibraryFolder: invoke('library:folder-rename'),
  removeLibraryFolder: invoke('library:folder-remove'),
  libraryOpenToAgents: invoke('library:agents'),
  setLibraryOpenToAgents: invoke('library:agents-set'),

  worktreeDiff: invoke('worktree:diff'),
  worktreeRollback: invoke('worktree:rollback'),

  updaterState: invoke('updater:state'),
  updaterRestart: invoke('updater:restart'),
  onUpdaterReady: listen('updater:ready'),
}

contextBridge.exposeInMainWorld('desk', desk)
