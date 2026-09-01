import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { allowedStock, roster, offStock, stockAgents } from '@/entities/teammate'
import { withRefused, withoutRefused } from '@/entities/claude-cli'
import { projectStore } from '@/entities/project'
import { GRID_PAD } from '@/shared/config/theme'
import { useFailure } from '@/shared/lib/failure/failure'
import { addressKey, team } from '@/widgets/team-sidebar'
import { useDeck, useFleet } from '@/widgets/tile-deck'
import { tidyUserName } from '@/entities/user'

import { layerOver } from '@/shared/lib/modal/modal'
import { screenGate } from '../screen-gate/screen-gate'
import { sessionLive, stirring } from '../../session/live/live'
import { useAgent } from '../../session/useAgent'
import { conversation } from '../../chat/conversation/conversation'
import { useAgentDefs } from '../../team/useAgentDefs'
import { useAccountChanges } from '../../account/useAccountChanges'
import { useAuth } from '../../account/useAuth'
import { useAppUpdate } from '../../session/useAppUpdate/useAppUpdate'
import { useLearnedSettings } from '../../settings/useLearnedSettings'
import { useFocus } from '../useFocus'
import { usePlugins } from '../../extensions/usePlugins'
import { useProjectMemory } from '../../project/useProjectMemory'
import { useProjects } from '../../project/useProjects'
import { useProjectSwitch } from '../../project/useProjectSwitch/useProjectSwitch'
import { useSessionProbe } from '../../session/useSessionProbe'
import { useAuthoredAgents } from '../../team/useAuthoredAgents'
import { useNudge } from '../../session/useNudge'
import { useSay } from '../../settings/useSay'
import { useConnectors } from '../../extensions/useConnectors'
import { useAttachments } from '../../chat/useAttachments'
import { useSettings } from '../../settings/useSettings'
import { useSettingsPanel } from '../../settings/useSettingsPanel'
import { useSidebarWidth } from '../useSidebarWidth'
import { useTranscript } from '../../chat/useTranscript'
import { useViewport } from '../useViewport'
import { useOffsetWidth } from '@/pages/workspace/model/screen/offset-width/useOffsetWidth'
import { lockOf, peopleOf } from '../../team/workspace-config/workspace-config'
import { t } from '@lingui/core/macro'

// The workspace's composition root: every hook that must live for the whole
// window is wired here once, and what comes back is grouped by domain so a
// screen part takes only the group it draws.
export function useWorkspace() {
  const { settings, loading, failure: settingsFailure, update } = useSettings()
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  const { defs, drafts, hire, edit, release, note: teamNote, settleNote } = useAgentDefs()
  const { failure: projectFailure, report: reportProject } = useFailure()
  const { all: allProjects, refresh: refreshProjects } = useProjects(project)

  const authored = useAuthoredAgents(project?.path ?? null)
  const chat = useTranscript(project?.id ?? null)
  const runConfig = {
    permissionMode: settings.permissionMode,
    model: settings.model,
    effort: settings.effort,
    people: peopleOf(defs),
    lock: lockOf(settings, defs, authored),
    resume: chat.resumeId,
  }
  const agent = useAgent(runConfig, (model) =>
    update({ refusedModels: withRefused(settings.refusedModels, model) }),
  )
  const { conversation: conv, children, status, nowMs } = agent

  useEffect(() => {
    if (!settings.refusedModels.includes(settings.model)) return
    if (status.cost.turns === 0) return
    update({ refusedModels: withoutRefused(settings.refusedModels, settings.model) })
  }, [status.cost.turns, settings.model, settings.refusedModels, update])

  useSay(settings.tongue, !loading)
  const auth = useAuth()
  const accountAt = useAccountChanges(settings, update)
  useAppUpdate()
  const deck = useDeck()
  const viewport = useViewport()
  const projectKnown = useProjectMemory(reportProject(t`Could not reopen your last project`))
  const panel = useSettingsPanel(settings, update)
  const sidebar = useSidebarWidth(settings, update, viewport.w)
  const [attachSidebar, sidebarBoxW] = useOffsetWidth<HTMLDivElement>()
  const focus = useFocus()

  const signedIn = auth.auth?.state === 'signed-in'
  const yourName = tidyUserName(settings.userName)
  const deckSidebarW = sidebar.span + GRID_PAD * 2

  const gate = screenGate({
    settingsLoaded: !loading,
    authKnown: auth.authKnown,
    projectKnown,
    chatKnown: chat.ready,
    loggedIn: signedIn,
    hasProject: project?.path != null,
    setupDone: settings.setupDone,
    onboarded: settings.onboarded,
    settingsOpen: panel.open,
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [pendingRestart, setPendingRestart] = useState<string | null>(null)
  const shelf = usePlugins(gate === 'setup')
  const attach = useAttachments()
  const wires = useConnectors(
    shelf.open || drawerOpen || gate === 'conversation',
    project?.id ?? null,
    accountAt,
  )
  useSessionProbe(
    runConfig,
    gate !== 'holding' && status.session === null,
    project?.path ?? null,
    auth.accounts,
    accountAt,
    gate !== 'holding',
    conv.status === 'working',
  )
  useNudge(settings.notify, conv.status, conv.permission, conv.trouble)
  useFleet(deck, children, nowMs, viewport, deckSidebarW)

  useLearnedSettings(status, settings, update)

  const stock = stockAgents(
    settings.knownAgents,
    defs.map((def) => def.name),
    authored,
  )
  const openAgent = children.find((session) => session.id === focus.openAgentId) ?? null
  // The probe keeps reporting a session after our child has been stopped, so
  // status.session outlives the thing it describes.
  const held = agent.running ? status.session : null
  const sessionAgentNames = held?.agents ?? []
  const teamMembers = team(
    defs,
    sessionAgentNames,
    roster(sessionAgentNames, children, conv.status !== 'done'),
  )
  useEffect(() => {
    if (settings.wasStockOn === null || stock.length === 0) return
    const wasOn = new Set(settings.wasStockOn.map((one) => one.toLocaleLowerCase()))
    update({
      stockOff: stock.filter((name) => !wasOn.has(name.toLocaleLowerCase())),
      wasStockOn: null,
    })
  }, [settings.wasStockOn, stock, update])

  const live = sessionLive(status, conv.status)
  const atWork = stirring(conv.status, children)
  const sidebarLabel = sidebar.open ? t`Hide team sidebar` : t`Show team sidebar`
  const sessionId = status.session?.id ?? null
  useEffect(() => {
    setPendingRestart(null)
    settleNote()
  }, [sessionId, settleNote])
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented || layerOver(document)) return
      setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const addressable = useRef(teamMembers)
  useEffect(() => {
    addressable.current = teamMembers
  })
  useEffect(() => {
    if (gate !== 'conversation') return undefined
    const onKey = (event: KeyboardEvent): void => {
      if (layerOver(document)) return
      const got = addressKey(
        { key: event.key, mod: event.metaKey || event.ctrlKey },
        addressable.current.length,
      )
      if (got === null) return
      event.preventDefault()
      if (got === 'clear') {
        focus.address(null)
        return
      }
      const member = addressable.current[got]
      if (member?.callable) focus.address(member.type)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gate])

  const projects = useProjectSwitch({
    project,
    allProjects,
    refreshProjects,
    report: reportProject,
    dropSession: () => {
      // The running agent is rooted in the old folder; left alive it would
      // keep streaming turns into the new project's transcript.
      agent.reset()
      focus.clearAll()
    },
  })

  function reload(patch: Partial<typeof settings>, said: string): void {
    update(patch)
    if (status.session === null) return
    setPendingRestart(said)
  }

  function swap(go: () => void): void {
    const cutOff = agent.conversation.status === 'working'
    agent.reset()
    if (cutOff) conversation.system(t`You left before the reply finished, so it stops here.`)
    focus.clearAll()
    setLibraryOpen(false)
    go()
  }

  const agentToggles = {
    stock,
    on: allowedStock(stock, settings.stockOff),
    onChange: (name: string, on: boolean) =>
      reload(
        { stockOff: offStock(settings.stockOff, name, on) },
        on
          ? t`${name} is on. The running session cannot call them yet.`
          : t`${name} is off. The running session keeps them until it ends.`,
      ),
  }

  return {
    prefs: { settings, update, reload, failure: settingsFailure },
    account: { auth, signedIn, swap },
    projects: {
      current: project,
      all: allProjects,
      ...projects,
      failure: projectFailure,
    },
    chatting: {
      agent,
      chat,
      conv,
      children,
      status,
      held,
      live,
      atWork,
      nowMs,
      attach,
      focus,
      openAgent,
      pendingRestart,
      setPendingRestart,
    },
    team: {
      defs,
      drafts,
      hire,
      edit,
      release,
      note: teamNote,
      settleNote,
      members: teamMembers,
      toggles: agentToggles,
      yourName,
    },
    layout: {
      gate,
      deck,
      viewport,
      sidebar,
      sidebarLabel,
      attachSidebar,
      sidebarBoxW,
      deckSidebarW,
      drawerOpen,
      setDrawerOpen,
      panel,
      libraryOpen,
      openLibrary: () => setLibraryOpen(true),
      leaveLibrary: () => setLibraryOpen(false),
    },
    extensions: { shelf, wires },
  }
}
