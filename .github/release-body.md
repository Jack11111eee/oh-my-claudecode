# oh-my-claudecode v5.7.11: Safer guarded input around trust prompts

## Release Notes

This release prevents guarded pane input from typing into any trust prompt or selecting a trust decision. Thanks to @iyoda for the contribution to #4528.

### Bug Fixes

- **fix(team): refuse guarded pane input on every trust prompt kind** (#4528, @iyoda)

### Other Changes

- **chore(sync): merge main v5.7.10 release into dev** (#4532)
- **ci: authorize generated artifacts for sync PR #4532** (#4533)

### Install / Update

The npm CLI and the Claude Code marketplace/plugin are separate install tracks, not either/or replacements. Update whichever track you use; if you have both installed, update both. CLI-dependent skill paths such as `ask` and CLI-backed `team` require the `omc` CLI from the npm package.

**CLI / runtime:**

```bash
npm install -g oh-my-claude-sisyphus@5.7.11
```

**Claude Code plugin:**

```text
/plugin marketplace update omc
```

**Full Changelog**: https://github.com/Yeachan-Heo/oh-my-claudecode/compare/v5.7.10...v5.7.11

## Contributors

Thank you to all contributors who made this release possible!

@iyoda @Yeachan-Heo
