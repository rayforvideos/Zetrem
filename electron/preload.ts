import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

/**
 * 이름 붙인 의도만 노출한다.
 * ipcRenderer 를 통째로 넘기면 이 화살표의 계약이 메인 프로세스 전체가 된다.
 *
 * 타입은 src/shared/api/desk.ts 에 있다 — 프로세스가 달라 import 로 묶을 수 없다.
 */
contextBridge.exposeInMainWorld('desk', {
  /** 다이얼로그 열기와 파일 읽기를 한 번에 한다 — 렌더러가 경로를 만질 일이 없어야 한다 */
  pickBackdropFile: (): Promise<unknown> => ipcRenderer.invoke('backdrop:pick'),
  restoreBackdropFile: (): Promise<unknown> => ipcRenderer.invoke('backdrop:restore'),
  pickProjectDir: (): Promise<unknown> => ipcRenderer.invoke('project:pick'),
  restoreProjectDir: (): Promise<unknown> => ipcRenderer.invoke('project:restore'),
  closeWindow: (): void => ipcRenderer.send('window:close'),
  startAgent: (id: string, prompt: string, config: unknown): Promise<void> =>
    ipcRenderer.invoke('agent:start', id, prompt, config),
  authStatus: (): Promise<unknown> => ipcRenderer.invoke('auth:status'),
  readSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:read'),
  writeSettings: (next: unknown): Promise<unknown> => ipcRenderer.invoke('settings:write', next),
  login: (): Promise<unknown> => ipcRenderer.invoke('auth:login'),
  onAuthProgress: (listener: (line: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, line: string): void => listener(line)
    ipcRenderer.on('auth:progress', handler)
    return () => ipcRenderer.removeListener('auth:progress', handler)
  },
  sendToAgent: (id: string, text: string): void => ipcRenderer.send('agent:send', id, text),
  stopAgent: (id: string): void => ipcRenderer.send('agent:stop', id),
  respondPermission: (id: string, requestId: string, result: unknown): void =>
    ipcRenderer.send('agent:permission', id, requestId, result),
  onAgentEvent: (listener: (event: unknown) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: unknown): void => listener(payload)
    ipcRenderer.on('agent:event', handler)
    return () => ipcRenderer.removeListener('agent:event', handler)
  },
  latestCliVersion: (): Promise<unknown> => ipcRenderer.invoke('cli:latest'),
  runCliUpdate: (): Promise<unknown> => ipcRenderer.invoke('cli:update'),
})
