# oh-my-claudecode v5.7.6: Build artifact fixes and hook improvements

## Release Notes

Maintenance release with **5 bug fixes** and **2 improvements** across **10 merged PRs**, syncing improvements from main.

### Highlights

- **fix: remove zod from plugin HUD security config** (#4455)
- **fix(hooks): fall back from blank shell config directory overrides** (#4474)
- **fix(hooks): honor trailing commas in agent model JSONC** (#4473)

### Bug Fixes

- **fix(hud): preserve Node install global npm prefix** (#4471)
- **fix(hud): sanitize project npm prefix environment** (#4471)
- **fix(hud): restrict npm fallback to global prefix** (#4471)
- **fix(autoresearch): accept a leading UTF-8 BOM in sandbox.md frontmatter** (#4452)
- **fix(agents): read agent frontmatter by line-anchored delimiters and after a BOM** (#4451)

### Improvements

- **fix: remove zod from plugin HUD security config** (#4455) - Reduce plugin runtime security boundary
- **fix(hooks): fall back from blank shell config directory overrides** (#4474) - Improved hook environment handling

### Stats

- **10 PRs merged** | **5 bug fixes** | **2 improvements**

### Install / Update

The npm CLI and the Claude Code marketplace/plugin are separate install tracks, not either/or replacements. Update whichever track you use; if you have both installed, update both. CLI-dependent skill paths such as `ask` and CLI-backed `team` require the `omc` CLI from the npm package.

**CLI / runtime:**

```bash
npm install -g oh-my-claude-sisyphus@5.7.6
```

**Claude Code plugin:**

```text
/plugin marketplace update omc
```

**Full Changelog**: https://github.com/Yeachan-Heo/oh-my-claudecode/compare/v5.7.5...v5.7.6
