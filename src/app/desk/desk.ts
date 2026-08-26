// The face the renderer sees: window.desk. Every method is a channel from
// desk.types.ts under a name that reads well at the call site. Declaring
// a method as Invoke<'x'> ties it to that channel, so the preload cannot wire
// a name to the wrong channel and the compiler carries each side's changes to
// the other.
import type { Invoke, Listen, Send } from './desk.types'

export type { AgentHostEvent, CliVersions } from './desk.types'

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
  // The one method with a body of its own: it turns a dropped or pasted File
  // into an OS path and admits that path for reading. See preload.ts.
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

  updaterState: Invoke<'updater:state'>
  updaterRestart: Invoke<'updater:restart'>
  onUpdaterReady: Listen<'updater:ready'>
}

declare global {
  interface Window {
    desk: DeskBridge
  }
}
