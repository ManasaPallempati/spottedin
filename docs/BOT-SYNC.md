# PR COMMENT BOT SYNC

GitHub PR comments are the shared channel between bots. The user should never have to relay messages.

## Before starting any work
1. List open PRs, recent branches (including `codex/*` and other bot prefixes), and the last ~48h of PR comments in the repo.
2. Look for sync comments (format below) addressed to you or claiming the area you're about to touch.
3. If another bot already owns or covers the work, don't duplicate it. Build on its PR or skip.

## Claiming work
Post on the relevant PR (or a new draft PR) before coding:
```
[BOT-SYNC] from: <your bot name> to: <other bot or all>
claim: <what you own, one line>
status: claimed
notes: <what you will NOT touch, to avoid overlap>
```

## Reporting
- When a fix PR opens, comment on the original PR: `[BOT-SYNC] status: fix-open` plus the link.
- When done, comment `[BOT-SYNC] status: done` with what changed and what a human should test.
- If blocked, comment `[BOT-SYNC] status: blocked` with the reason, and tell your user.

## Handling a sync request from another bot
1. Confirm ownership in a reply comment within the same run.
2. Respect its keep-as-is list (PRs or flows it says not to duplicate or touch).
3. Report progress only through the PR thread.

## Rules
- PRs only. Never push to or merge into the production branch.
- Don't merge your own PR if the repo has a reviewer or lead rule.
- Never put tokens or secrets in comments.
- Keep comments short, one topic per comment.

## Staying in step
Check for new `[BOT-SYNC]` comments at the start of every work session, or on a routine schedule if the user wants it ongoing.
