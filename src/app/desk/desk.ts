import type { Invoke, Listen, Send } from './desk.types'

export type DeskBridge = {
  appVersion: Invoke<'app:version'>

  pickProjectDir: Invoke<'project:pick'>
  restoreProject: Invoke<'project:restore'>
  listProjects: Invoke<'project:list'>
  createProject: Invoke<'project:create'>
  openProject: Invoke<'project:open'>
  forgetProject: Invoke<'project:forget'>
  repathProject: Invoke<'project:repath'>

  startAgent: Invoke<'agent:start'>
  sendToAgent: Send<'agent:send'>
  stopAgent: Send<'agent:stop'>
  respondPermission: Send<'agent:permission'>
  onAgentEvent: Listen<'agent:event'>

  probeSession: Invoke<'session:probe'>
  sessionUsage: Invoke<'session:usage'>
  keptUsage: Invoke<'usage:kept'>

  authStatus: Invoke<'auth:status'>
  login: Invoke<'auth:login'>
  logout: Invoke<'auth:logout'>
  onAuthProgress: Listen<'auth:progress'>

  listAgentDefs: Invoke<'agents:list'>
  writeAgentDef: Invoke<'agents:write'>
  removeAgentDef: Invoke<'agents:remove'>
  replaceAgentDef: Invoke<'agents:replace'>
  pickKnowledge: Invoke<'agents:pickKnowledge'>
  authoredAgents: Invoke<'agents:authored'>

  readSettings: Invoke<'settings:read'>
  writeSettings: Invoke<'settings:write'>

  pickFiles: Invoke<'files:pick'>
  readFiles: Invoke<'files:read'>
  // Implemented in preload, not a channel: it also admits the path for reading.
  pathForFile(file: File): Promise<string>

  pluginCatalog: Invoke<'plugins:catalog'>
  pluginAvailable: Invoke<'plugins:available'>
  marketplaces: Invoke<'plugins:marketplaces'>
  pluginAct: Invoke<'plugins:act'>

  listConnectors: Invoke<'connectors:list'>
  connectorAct: Invoke<'connectors:act'>
  addConnector: Invoke<'connectors:add'>
  importConnectors: Invoke<'connectors:import'>

  listChats: Invoke<'transcript:list'>
  readTranscript: Invoke<'transcript:read'>
  writeTranscript: Invoke<'transcript:write'>
  forgetTranscript: Invoke<'transcript:forget'>

  nudge: Send<'nudge:show'>

  latestCliVersion: Invoke<'cli:latest'>
  runCliUpdate: Invoke<'cli:update'>
  installCli: Invoke<'cli:install'>

  listLibraryNotes: Invoke<'library:list'>
  readLibraryNote: Invoke<'library:read'>
  removeLibraryNote: Invoke<'library:remove'>
  writeLibraryNote: Invoke<'library:write'>
  createLibraryNote: Invoke<'library:create'>
  renameLibraryNote: Invoke<'library:rename'>
  fileLibraryNote: Invoke<'library:file'>
  searchLibrary: Invoke<'library:search'>
  libraryBacklinks: Invoke<'library:backlinks'>
  onLibraryChanged: Listen<'library:changed'>
  addLibraryFolder: Invoke<'library:folder-add'>
  renameLibraryFolder: Invoke<'library:folder-rename'>
  removeLibraryFolder: Invoke<'library:folder-remove'>
  libraryOpenToAgents: Invoke<'library:agents'>
  setLibraryOpenToAgents: Invoke<'library:agents-set'>

  updaterState: Invoke<'updater:state'>
  updaterRestart: Invoke<'updater:restart'>
  onUpdaterReady: Listen<'updater:ready'>
}

declare global {
  interface Window {
    desk: DeskBridge
  }
}
