import { MoreHorizontal } from 'lucide-react'
import { groupsOf, removableHere, switchableHere } from '@/entities/plugin'
import type { InstalledPlugin, PluginScope, PluginVerb } from '@/entities/plugin'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Switch } from '@/shared/ui/switch'
import { t } from '@lingui/core/macro'
import { Group, Quiet, Row, SectionTitle, Slot } from './parts'

// A marketplace ref is a git hash shared by every plugin from that marketplace,
// so it is not this plugin's version and is not worth showing. Only a real
// version number earns the subtitle.
function versionOf(plugin: InstalledPlugin): string | null {
  return plugin.version !== null && /^\d/.test(plugin.version) ? plugin.version : null
}

export function InstalledTab({
  here,
  busy,
  onAct,
  project,
}: {
  here: InstalledPlugin[]
  busy: string | null
  onAct(verb: PluginVerb, target: string, scope?: PluginScope): void
  project: string | null
}) {
  const groups = groupsOf(here)

  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>{t`Plugins`}</SectionTitle>
      {here.length === 0 && <Quiet>{t`Nothing installed yet.`}</Quiet>}
      {groups.map((group) => (
        <Group
          key={group.key}
          kind={group.key}
          title={group.title}
          note={group.note}
          titled={group.titled}
        >
          {group.plugins.map((plugin) => {
            const version = versionOf(plugin)
            const canRemove = removableHere(plugin.scope, plugin.projectPath, project)
            const canSwitch = switchableHere(plugin.scope, plugin.projectPath, project)
            return (
              <Row
                key={`${plugin.id}:${plugin.scope}`}
                title={plugin.name}
                note={[plugin.marketplace, version].filter(Boolean).join(' · ')}
                busy={busy === plugin.id}
                dim={!plugin.enabled && plugin.scope !== 'managed'}
              >
                {(canRemove || canSwitch) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t`More for ${plugin.name}`}
                        className="rounded-md text-muted-foreground"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => onAct('update', plugin.id, plugin.scope)}>
                        {t`Update`}
                      </DropdownMenuItem>
                      {canRemove && (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => onAct('uninstall', plugin.id, plugin.scope)}
                        >
                          {t`Remove`}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Slot width="w-8">
                  {canSwitch && (
                    <Switch
                      checked={plugin.enabled}
                      aria-label={plugin.name}
                      className="zt-hit-around"
                      onCheckedChange={(on) =>
                        onAct(on ? 'enable' : 'disable', plugin.id, plugin.scope)
                      }
                    />
                  )}
                </Slot>
              </Row>
            )
          })}
        </Group>
      ))}
    </section>
  )
}
