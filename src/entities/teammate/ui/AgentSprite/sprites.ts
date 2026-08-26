import jelly_default from '@/entities/teammate/ui/AgentSprite/sprites/default/jelly_default.png'
import heart_default from '@/entities/teammate/ui/AgentSprite/sprites/default/heart_default.png'
import planet_default from '@/entities/teammate/ui/AgentSprite/sprites/default/planet_default.png'
import star_default from '@/entities/teammate/ui/AgentSprite/sprites/default/star_default.png'
import double_default from '@/entities/teammate/ui/AgentSprite/sprites/default/double_default.png'
import flower_default from '@/entities/teammate/ui/AgentSprite/sprites/default/flower_default.png'
import ghost_default from '@/entities/teammate/ui/AgentSprite/sprites/default/ghost_default.png'
import bunny_default from '@/entities/teammate/ui/AgentSprite/sprites/default/bunny_default.png'
import rock_default from '@/entities/teammate/ui/AgentSprite/sprites/default/rock_default.png'
import cloud_default from '@/entities/teammate/ui/AgentSprite/sprites/default/cloud_default.png'
import jelly_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/jelly_sleepy.png'
import heart_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/heart_sleepy.png'
import planet_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/planet_sleepy.png'
import star_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/star_sleepy.png'
import double_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/double_sleepy.png'
import flower_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/flower_sleepy.png'
import ghost_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/ghost_sleepy.png'
import bunny_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/bunny_sleepy.png'
import rock_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/rock_sleepy.png'
import cloud_sleepy from '@/entities/teammate/ui/AgentSprite/sprites/sleepy/cloud_sleepy.png'
import jelly_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/jelly_relax.png'
import heart_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/heart_relax.png'
import planet_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/planet_relax.png'
import star_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/star_relax.png'
import double_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/double_relax.png'
import flower_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/flower_relax.png'
import ghost_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/ghost_relax.png'
import bunny_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/bunny_relax.png'
import rock_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/rock_relax.png'
import cloud_relax from '@/entities/teammate/ui/AgentSprite/sprites/relax/cloud_relax.png'
import jelly_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/jelly_busy.png'
import heart_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/heart_busy.png'
import planet_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/planet_busy.png'
import star_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/star_busy.png'
import double_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/double_busy.png'
import flower_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/flower_busy.png'
import ghost_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/ghost_busy.png'
import bunny_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/bunny_busy.png'
import rock_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/rock_busy.png'
import cloud_busy from '@/entities/teammate/ui/AgentSprite/sprites/busy/cloud_busy.png'

import type { CharacterId, Mood } from '../../lib/character/character.types'

export const SPRITES: Record<CharacterId, Record<Mood, string>> = {
  jelly: { default: jelly_default, sleepy: jelly_sleepy, relax: jelly_relax, busy: jelly_busy },
  heart: { default: heart_default, sleepy: heart_sleepy, relax: heart_relax, busy: heart_busy },
  planet: {
    default: planet_default,
    sleepy: planet_sleepy,
    relax: planet_relax,
    busy: planet_busy,
  },
  star: { default: star_default, sleepy: star_sleepy, relax: star_relax, busy: star_busy },
  double: {
    default: double_default,
    sleepy: double_sleepy,
    relax: double_relax,
    busy: double_busy,
  },
  flower: {
    default: flower_default,
    sleepy: flower_sleepy,
    relax: flower_relax,
    busy: flower_busy,
  },
  ghost: { default: ghost_default, sleepy: ghost_sleepy, relax: ghost_relax, busy: ghost_busy },
  bunny: { default: bunny_default, sleepy: bunny_sleepy, relax: bunny_relax, busy: bunny_busy },
  rock: { default: rock_default, sleepy: rock_sleepy, relax: rock_relax, busy: rock_busy },
  cloud: { default: cloud_default, sleepy: cloud_sleepy, relax: cloud_relax, busy: cloud_busy },
}
