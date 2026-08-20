# Security

## Reporting

Please do not open a public issue. Use GitHub's private advisory form:
[Report a vulnerability](https://github.com/rayforvideos/Zetrem/security/advisories/new).

You will get an answer within a week. If a fix is needed, you will hear how it
is going until it ships, and you will be credited in the release notes unless
you would rather not be.

## What the app has access to

Worth knowing when judging whether something is a Zetrem problem:

- **Zetrem does not bundle Claude Code.** It runs whatever `claude` is on your
  `PATH`, so a vulnerability in the CLI itself belongs to
  [Anthropic](https://github.com/anthropics/claude-code/security).
- **Signing in is the CLI's.** Zetrem calls `claude auth`; it never sees or
  stores your credentials. Signing out clears the machine-wide keychain entry,
  which signs out every Claude Code on that computer, not only this app.
- **Agents run with your permissions.** The permission mode you pick decides how
  much they do without asking, and "Allow all" passes
  `--dangerously-skip-permissions` to the CLI.
- **Your work stays local.** Conversations, teammates and settings are written
  under the app's own directory. Zetrem sends nothing anywhere except through
  the CLI you already run.

## Out of scope

An agent doing something destructive that you approved, and anything that
assumes an attacker already controls your machine or your keychain.
