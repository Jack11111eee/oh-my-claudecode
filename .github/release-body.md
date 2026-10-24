# oh-my-claudecode v5.7.12: More reliable URL and timeout handling

## Release Notes

This release improves parsing of provider and issue URLs ending in slashes or sub-pages, hardens environment-based timeout handling, and preserves tmux pane IDs when session names contain spaces. Thanks to @rudycelekli for contributions to #4542, #4543, #4544, #4545, #4546, #4547, and #4549.

### Bug Fixes

- **fix(teleport): read PR and issue URLs with a trailing slash or sub-page** (#4542, @rudycelekli)
- **fix(lsp): read whole-integer timeouts from the environment** (#4543, @rudycelekli)
- **fix(rate-limit-wait): keep pane IDs for tmux sessions with spaces** (#4544, @rudycelekli)
- **fix(team): read the shell-ready timeout as a whole integer** (#4545, @rudycelekli)
- **fix(team): read launch-ack timeouts as whole integers** (#4546, @rudycelekli)
- **fix(team): read the worker-ready timeout as a whole integer** (#4547, @rudycelekli)
- **fix(providers): parse remote URLs that end in a slash** (#4549, @rudycelekli)

### Other Changes

- **chore(sync): merge main's v5.7.11 release into dev** (#4540)
- **ci: authorize generated artifacts for sync PR #4540** (#4541)
- **ci: authorize generated artifacts for an earlier main-to-dev sync attempt** (#4539)

### Install / Update

The npm CLI and the Claude Code marketplace/plugin are separate install tracks, not either/or replacements. Update whichever track you use; if you have both installed, update both. CLI-dependent skill paths such as `ask` and CLI-backed `team` require the `omc` CLI from the npm package.

**CLI / runtime:**

```bash
npm install -g oh-my-claude-sisyphus@5.7.12
```

**Claude Code plugin:**

```text
/plugin marketplace update omc
```

**Full Changelog**: https://github.com/Yeachan-Heo/oh-my-claudecode/compare/v5.7.11...v5.7.12

## Contributors

Thank you to all contributors who made this release possible!

@rudycelekli @Yeachan-Heo
