const BY_HOST: [string, string][] = [
  ['figma.com', 'figma'],
  ['notion.com', 'notion'],
  ['notion.so', 'notion'],
  ['gmailmcp.googleapis.com', 'gmail'],
  ['mail.google.com', 'gmail'],
  ['drivemcp.googleapis.com', 'googledrive'],
  ['drive.google.com', 'googledrive'],
  ['calendarmcp.googleapis.com', 'googlecalendar'],
  ['calendar.google.com', 'googlecalendar'],
  ['asana.com', 'asana'],
  ['sentry.dev', 'sentry'],
  ['sentry.io', 'sentry'],
  ['github.com', 'github'],
  ['linear.app', 'linear'],
  ['atlassian.com', 'atlassian'],
  ['stripe.com', 'stripe'],
  ['supabase.com', 'supabase'],
  ['vercel.com', 'vercel'],
  ['cloudflare.com', 'cloudflare'],
  ['hubspot.com', 'hubspot'],
  ['zapier.com', 'zapier'],
  ['airtable.com', 'airtable'],
  ['slack.com', 'slack'],
  ['anthropic.com', 'anthropic'],
]

const BY_WORD: [string, string][] = [
  ['github', 'github'],
  ['figma', 'figma'],
  ['notion', 'notion'],
  ['linear', 'linear'],
  ['sentry', 'sentry'],
  ['stripe', 'stripe'],
  ['supabase', 'supabase'],
  ['cloudflare', 'cloudflare'],
  ['airtable', 'airtable'],
]

function hostOf(where: string): string | null {
  try {
    return new URL(where.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function brandOf(where: string): string | null {
  const host = hostOf(where)
  if (host !== null) {
    for (const [tail, slug] of BY_HOST) {
      if (host === tail || host.endsWith(`.${tail}`)) return slug
    }
    return null
  }
  const said = where.toLowerCase()
  for (const [word, slug] of BY_WORD) {
    if (said.includes(word)) return slug
  }
  return null
}
