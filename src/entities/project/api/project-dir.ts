import type { Project } from '../model/project'

/** 디렉토리 다이얼로그를 열어 프로젝트를 고른다. 취소하면 null */
export async function pickProject(): Promise<Project | null> {
  return toProject(await window.desk.pickProjectDir())
}

/** 지난 세션의 프로젝트를 되살린다. 기억이 없거나 디렉토리가 사라졌으면 null */
export async function restoreProject(): Promise<Project | null> {
  return toProject(await window.desk.restoreProjectDir())
}

function toProject(path: string | null): Project | null {
  if (!path) return null
  return { path, name: path.split('/').at(-1) ?? path }
}
