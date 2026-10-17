# oh-my-claudecode v5.7.4: More reliable hooks, team workflows, HUD, and Jev planning

## Release Notes

Release with **1 new feature**, **4 bug fixes**, **1 performance improvement**, and **3 test improvements** across **9 merged PRs**.

### Highlights

- **feat(jev): add OMC_JEV_PLAN_MODE to keep Jev from deciding in plan mode** (#4395)
- **fix(team): quarantine stale Cursor verdicts and retain them on unreadable tasks** (#4380)
- **perf(hooks): launch the file-context injectors only for the tools they act on** (#4373)

### New Features

- **feat(jev): add OMC_JEV_PLAN_MODE to keep Jev from deciding in plan mode** (#4395)

### Performance Improvements

- **perf(hooks): launch the file-context injectors only for the tools they act on** (#4373)
  - File-context injectors now launch only for the tools they act on, reducing hook overhead.

### Bug Fixes

- **fix(plugin-cache): link stale plugin roots only to a real cache directory** (#4375)
- **fix(installer): log CLAUDE.md as already up to date when install leaves it unchanged** (#4377)
- **fix(team): quarantine stale Cursor verdicts and retain them on unreadable tasks** (#4380)
- **fix: scope HUD stdin cache per session using stdin.session_id** (#4398)

### Test Improvements

- **test(run-cjs): blank user-level OMC env in the worker skip-guard hook spawns** (#4376)
- **test(atomic-write): give SQLite contention timing bounds a runner margin** (#4385)
- **test: make shutdown and state-clear race checks environment-independent** (#4379)

### Stats

- **9 PRs merged** | **1 new feature** | **4 bug fixes** | **1 performance improvement** | **3 test improvements**

### Install / Update

The npm CLI and the Claude Code marketplace/plugin are separate install tracks, not either/or replacements. Update whichever track you use; if you have both installed, update both. CLI-dependent skill paths such as `ask` and CLI-backed `team` require the `omc` CLI from the npm package.

**CLI / runtime:**

```bash
npm install -g oh-my-claude-sisyphus@5.7.4
```

**Claude Code plugin:**

```text
/plugin marketplace update omc
```

**Full Changelog**: https://github.com/Yeachan-Heo/oh-my-claudecode/compare/v5.7.3...v5.7.4
