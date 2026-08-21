import { Trash2 } from 'lucide-react'
import { groupsOf, removableHere, switchableHere } from '@/entities/plugin'
import type { InstalledPlugin, PluginScope, PluginVerb } from '@/entities/plugin'
import { Switch } from '@/shared/ui/switch'
import { t } from '@lingui/core/macro'
import { Group, Quiet, Quietly, Row, Slot } from './parts'

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
    <>
      {here.length === 0 && <Quiet>{t`Nothing installed yet.`}</Quiet>}
      {groups.map((group) => (
        <Group
          key={group.key}
          kind={group.key}
          title={group.title}
          note={group.note}
          titled={group.titled}
        >
          {group.plugins.map((plugin) => (
            <Row
              key={`${plugin.id}:${plugin.scope}`}
              title={plugin.name}
              note={[plugin.marketplace, plugin.version].filter(Boolean).join(' · ')}
              busy={busy === plugin.id}
              dim={!plugin.enabled && plugin.scope !== 'managed'}
            >
              <Slot width="w-[58px]">
                <Quietly
                  label={t`Update`}
                  onClick={() => onAct('update', plugin.id, plugin.scope)}
                />
              </Slot>
              <Slot width="w-9">
                {removableHere(plugin.scope, plugin.projectPath, project) && (
                  <Quietly
                    label={t`Remove`}
                    icon={<Trash2 />}
                    onClick={() => onAct('uninstall', plugin.id, plugin.scope)}
                  />
                )}
              </Slot>
              <Slot width="w-8">
                {switchableHere(plugin.scope, plugin.projectPath, project) && (
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
          ))}
        </Group>
      ))}
    </>
  )
}
