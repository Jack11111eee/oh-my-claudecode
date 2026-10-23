# oh-my-claudecode v5.7.11: Safer guarded input around trust prompts

## Release Notes

This release prevents guarded pane input from typing into any trust prompt or selecting a trust decision. Thanks to @iyoda for the contribution to #4528.

### Bug Fixes

- **fix(team): refuse guarded pane input on every trust prompt kind** (#4528, @iyoda)

### Other Changes

- **chore(sync): merge main v5.7.10 release into dev** (#4532)
- **ci: authorize generated artifacts for sync PR #4532** (#4533)

---

# oh-my-claudecode v5.7.10: Fail-closed Ralph PRD verification

## Release Notes

This release makes `omc ralph verify` fail closed when an existing PRD is invalid or unreadable, instead of incorrectly reporting that no feedback commands exist. Thanks to Get-bot for reporting #4526.

### Bug Fixes

- **fix(ralph): fail closed for invalid PRDs** (#4527, fixes #4526; reported by Get-bot)

### Other Changes

- **chore(sync): merge the v5.7.9 main release into dev** (#4524)
- **ci: authorize generated artifacts for sync PR #4524** (#4525)

---

# oh-my-claudecode v5.7.9: Safer Windows startup, Codex TOML output, and aligned Jev timeouts

## Release Notes

This release fixes Windows startup trust-prompt handling, escaping unpaired surrogates in Codex MCP TOML output, and aligning Jev active parent timeouts with resolver behavior. Thanks to @rudycelekli and @alw51307 for their contributions.

### Bug Fixes

- **fix(team): guard Windows startup trust prompts** (#4502)
- **fix(mcp-registry): escape unpaired surrogates in Codex TOML output** (#4512, @rudycelekli)
- **fix(jev): align active parent timeout with resolver** (#4515, @alw51307)

### Other Changes

- **chore(sync): merge v5.7.8 main release into dev and rebuild the inventory** (#4519)
- **ci: authorize generated artifacts for the v5.7.8 main-to-dev sync** (#4520)

---

# oh-my-claudecode v5.7.8: More reliable Windows workers and configuration handling

## Release Notes

This release improves native Windows worker supervision, JSON and JSONC parsing, numeric configuration validation, think-mode matching, diagnostic environment handling, and prerelease update ordering. Thanks to @rudycelekli for contributions to #4493, #4494, #4497, #4499, #4508, #4510, and #4511.

### Bug Fixes

- **fix(team): repair native Windows worker supervision and startup** (#4479, fixes #4386)
- **fix(team): fit the source-bound Windows supervisor invocation and reject unresolved provider executables** (#4479)
- **fix(team): submit tmux startup inboxes and shorten only overflowing Windows notifications** (#4479)
- **fix(team): recognize Codex folder-trust prompts without sending task text or granting persistent trust** (#4479)
- **fix(jsonc): accept a leading UTF-8 BOM in JSONC configuration files** (#4494)
- **fix(notifications): reject non-positive reply polling intervals and rate limits** (#4497)
- **fix(json): accept a leading UTF-8 BOM in hand-authored JSON files** (#4499)
- **fix(think-mode): match multilingual think keywords as whole words** (#4493)
- **fix(debug): read `OMC_DEBUG` through one shared convention** (#4508)
- **fix(host-load-gate): reject malformed thresholds instead of silently truncating them** (#4510)
- **fix(version): rank prereleases below their corresponding release** (#4511)

### Other Changes

- **test(ci): make SessionStart timing tests deterministic** (#4514)
- **ci:** canonicalize generated-artifact authorization timestamps and refresh authorization entries for release and sync PRs (#4480, #4504, #4507, #4509)
- **chore(inventory): rebuild generated artifacts and inventory during the v5.7.7 main-to-dev sync** (#4506)

---

# oh-my-claudecode v5.7.7: Codex hook compatibility and safer HUD loading

## Release Notes

This release includes fixes for Codex hook output, HUD fallback security and reliability, configuration parsing, team shutdown validation, and plugin-only bootstrap.

### Bug Fixes

- **fix(hooks): emit Codex-compatible PreToolUse output** (#4489, fixes #4488)
- **fix(hud): restrict npm fallback to the global prefix** (#4471, #4472)
- **fix(hooks): fall back from blank shell config directory overrides** (#4474)
- **fix(hooks): honor trailing commas in agent model JSONC** (#4473)
- **fix(installer): recognize quoted Codex MCP keys** (#4469)
- **fix(hud): report cached HUD load failures** (#4468)
- **fix(skills): align argument hints with behavior** (#4465)
- **fix(team): validate shutdown acknowledgements before consuming them** (#4462)
- **fix(ultragoal): allow plugin-only bootstrap commands** (#4459)

### Other Changes

- **test(ci): make timing regression tests deterministic** (#4464)
- **ci: canonicalize generated-artifact authorization expiry timestamps** (#4484)
- **ci: sync the v5.7.6 main release back into dev** (#4485)
- **chore(inventory): regenerate the inventory graph** (#4486)

---
# oh-my-claudecode v5.7.6: Fix plugin-mode HUD loading and tighten input validation

## Release Notes

Hotfix for v5.7.5: the plugin HUD no longer imports Zod from the plugin cache, where `node_modules` is unavailable. This release also fixes HUD estimates, frontmatter handling, command parsing, and numeric option validation.

### Bug Fixes

- **fix(hud): remove the runtime Zod dependency from plugin security config** (#4454, PR #4455)
- **fix(hud): exclude local API request records from the payload estimate** (#4437)
- **fix(featured-contributors): reject invalid `--min-stars` values** (#4439)
- **fix(session-end): prevent `OMC_DAILY_CHAIN_LIMIT` from flooring to zero** (#4440)
- **fix(autoresearch): reject invalid `--max-waves` and `--poll-interval` values** (#4441)
- **fix(team): reject non-integer numeric CLI flag values** (#4442)
- **fix(auto-slash-command): keep the plugin namespace when parsing slash commands** (#4450)
- **fix(agents): read frontmatter by line-anchored delimiters, including after a BOM** (#4451)
- **fix(autoresearch): accept a leading UTF-8 BOM in `sandbox.md` frontmatter** (#4452)

### Other Changes

- **ci:** refresh generated-artifact authorizations and inventory metadata for the main-to-dev sync (#4444, #4445, #4449, #4453)

---

# oh-my-claudecode v5.7.5: More reliable frontmatter, glob matching, and worker startup

## Release Notes

Release with **1 new feature**, **22 bug fixes**, **1 CI improvement**, and **1 retired-tools removal** across **25 merged PRs**.

### Highlights

- **feat(installer): add `claudeMdEnabled` opt-out for the global CLAUDE.md** (#4383)
- **fix(frontmatter): handle CRLF, BOMs, YAML block scalars, and quoted values across files** (#4392, #4393, #4402, #4405, #4406, #4407, #4408, #4410, #4411)
- **fix: match configured globs literally and stabilize team worker startup** (#4390, #4403, #4404, #4413, #4416, #4418)

### New Features

- **feat(installer): add `claudeMdEnabled` opt-out for the global CLAUDE.md** (#4383)
  - Lets users leave the global `CLAUDE.md` untouched when configuring the installer.

### Bug Fixes

- **fix(session-start): bound the stabilization helper lifetime and batch the Darwin identity probe** (#4384)
- **fix: ignore malformed context-guard and security configuration values** (#4388, #4389)
- **fix(state-manager): match list and cleanup glob patterns literally** (#4390)
- **fix(learner): parse block-list skill metadata in CRLF files** (#4392)
- **fix(frontmatter): preserve quoted flow values** (#4393)
- **fix(ralph): retain feedback failures when tests log ENOENT** (#4399)
- **fix(commands): parse CRLF frontmatter in command files** (#4402)
- **fix(rules-injector): support `{a,b}` brace alternation in rule globs** (#4403)
- **fix(team): align worker startup ACK and shutdown instructions** (#4404)
- **fix(frontmatter): read YAML block scalars and indented block-list values** (#4405, #4406)
- **fix(rules-injector): ignore trailing YAML comments and preserve quoted hashes in flow values** (#4407)
- **fix(frontmatter): accept a leading UTF-8 BOM in skill, command, rule, and wiki files** (#4408, #4410)
- **fix(cli): reject non-integer values for wait and session options** (#4409)
- **fix(autoresearch): keep quotes inside an unquoted `sandbox.md` value** (#4411)
- **fix(team): stabilize cmux worker startup** (#4413)
- **fix(factcheck): match strict project globs literally** (#4416)
- **fix(doctor): ignore empty `OMC_SKIP_HOOKS` entries** (#4417)
- **fix(learner): match glob triggers literally apart from `*`** (#4418)
- **fix(factory): validate `listen --port` as an integer in 0–65535** (#4420)

### Other Changes

- **test(session-end): stabilize configured process exit on CI** (#4397)
- **chore: remove retired merge-readiness MCP tools and regenerate shipped artifacts** (#4422)
- **ci: refresh inventory baselines and generated-artifact authorizations** (#4423–#4432)

### Stats

- **25 PRs merged** | **1 new feature** | **22 bug fixes** | **1 CI improvement** | **1 retired-tools removal**

---
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

---
# oh-my-claudecode v5.7.3: Retire agent variant names, parallel consensus reviews

## Release Notes

Release with **2 improvements**, **1 bug fix**, **2 CI improvements** across **5 merged PRs**.

### Highlights

- **fix(#4343): Retire tiered agent variant names — use model parameter instead** (#4345)
- **fix(#4355): Enable parallel Architect/Critic reviews when both are Claude agents** (#4358)
- **fix(#4363): Ralph started through Skill tool now gets state with prd_mode and prd.json** (#4364)

### Changes

- **fix(#4343): Retire tiered agent variant names — use model parameter instead** (#4345)
  - Replaces tier-based agent selection (fast/balanced/strong) with direct `--model` parameter
  - Simplifies agent routing and removes tier-selector complexity

- **fix(#4355): Enable parallel Architect/Critic reviews when both are Claude agents** (#4358)
  - Allows concurrent Architect and Critic consensus reviews for improved workflow efficiency
  - Coordination guarantees remain for non-Claude agent roles

- **fix(#4363): Ralph started through Skill tool now gets state with prd_mode and prd.json** (#4364)
  - Skill tool invocation of ralph now properly receives planning state artifacts
  - Fixes missing PRD state when using the `skill` tool interface

### CI Improvements

- **fix(ci): restore inventory-graph drift baseline on dev** (#4360, #4365)

### Stats

- **5 PRs merged** | **0 new features** | **1 bug fix** | **2 improvements** | **2 CI improvements**

---

# oh-my-claudecode v5.7.2: add Muse and

## Release Notes

Release with **1 new feature**, **3 bug fixes**, **6 other changes** across **10 merged PRs**.

### Highlights

- **feat(ask): add Muse and fix Grok role prompt transport**

### New Features

- **feat(ask): add Muse and fix Grok role prompt transport**

### Bug Fixes

- **fix(inventory): regenerate inventory graph after #4348**
- **fix(test): set TMPDIR for grok/muse env vars test with Windows platform**
- **fix(ask): mirror Muse ask guard in standalone hook and document Muse in README**

### Documentation

- **docs: refresh inventory-graph baseline after features.md changes**
- **docs: complete ultrawork removal from features.md**
- **docs: remove retired ultrawork/web-clone references** (#4343)

### Other Changes

- **chore: rebind PR #4345 authorization to head 6d1e331a**
- **chore: update PR #4345 authorization with final rebuilt head 36b49bd13**
- **ci: rebind PR #4345 authorization to head 494758c7 and merge base 5a394754**
- **ci: rebind PR #4345 authorization for new head commit (r10)**
- **ci: rebind PR #4345 authorization for new head commit**
- **ci: authorize stale tier-selector dist removal for PR #4345**

### Stats

- **10 PRs merged** | **1 new feature** | **3 bug fixes** | **0 security/hardening improvements** | **6 other changes**
