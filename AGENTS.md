# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the production plugin. Core behavior is grouped by domain: `src/core/commands` for button actions, `src/core/config` for persistence and import/export, `src/core/surfaces` for top bar/status bar/Dock rendering, and `src/shared` for cross-cutting types and utilities. Vue UI entry points live in `src/App.vue` and `src/main.ts`; reusable theme components live in `src/components/SiyuanTheme`.

`tests/` holds Vitest coverage for runtime snapshots, config storage, command execution, and preview/layout behavior. `developer_docs/` and `docs/` store product and Siyuan API references. `plugin-sample-vite-vue/` is an upstream sample scaffold; keep changes there isolated unless you are intentionally syncing template behavior.

## Build, Test, and Development Commands
Use Node with `npm` from the repo root.

- `npm install`: install dependencies.
- `npm run dev`: watch build for local plugin development.
- `npm run build`: create a production bundle with Vite.
- `npm test`: run the full Vitest suite once.
- `npm run test:watch`: rerun tests interactively during development.
- `npm run release:patch` / `release:minor` / `release:major`: bump versions and run the release script.

## Coding Style & Naming Conventions
The project uses TypeScript, Vue 3, SCSS, and ESLint via [`eslint.config.mjs`](/D:/MyCodingProjects/siyuan-power-buttons/eslint.config.mjs). Follow 2-space indentation, single quotes, and trailing commas in multiline objects/arrays. Prefer named exports for shared helpers and keep barrel files (`index.ts`) limited to re-exports.

Use `PascalCase` for Vue components, `camelCase` for functions and variables, and `kebab-case` for test filenames such as `command-executor.test.ts`. Keep new modules close to the domain they serve rather than creating broad utility buckets.

## Testing Guidelines
Write tests with Vitest in `tests/`, mirroring the feature area under `src/`. Cover new behavior and regression paths together, especially for command dispatch, DOM adapters, and config migrations. Mock Siyuan APIs and browser globals explicitly; avoid relying on runtime state from the host app.

## Commit & Pull Request Guidelines
Recent history uses short imperative subjects such as `Add experimental feature version guard` and `Fix builtin button execution and statusbar icons`. Keep commits focused and descriptive. For pull requests, include a summary of user-visible changes, linked issues, test results, and screenshots or GIFs for UI/configuration changes. Call out any Siyuan version assumptions, especially when touching experimental DOM-dependent features.

## Reference Projects

重要：在涉及解析思源笔记文档块结构和内容、确认API时，务必查看developer_docs目录下开发者文档 和 siyuan-note 项目源码确认，不要凭猜测开发和测试。

路径按开发机器取用其一（两套路径指向同一批参考工程，不同机器布局不同）：

- siyuan-note（思源笔记源码项目）
  - Windows 开发机：`D:\MyCodingProjects\siyuan-note`
  - Linux 开发机：`/home/quincyzou/projects/siyuan-note`
- `developer_docs/`：思源笔记插件开发者文档
  - 仓库根目录，并已列入 `.gitignore`（仅本机参考，不入库、不推送）。
- 核对内核行为时以 siyuan-note 的 Go 源码为准（`kernel/server/serve.go`、`kernel/model/assets.go`），`app/src` 为前端实现参考；developer_docs 未覆盖的细节不要凭猜测推断。
