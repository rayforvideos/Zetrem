import { i18n } from '@lingui/core'
import { messages as en } from '@/shared/locales/en/messages.po'
import { messages as ko } from '@/shared/locales/ko/messages.po'

i18n.load({ en, ko })
i18n.activate('en')
