# Contributing

English and Persian contributions are welcome. For a large feature, open an issue describing the user problem before changing the architecture.

## Local setup

Use Windows 10/11 x64 and Node.js 22.12 or newer. Clone your fork, open its directory, and run:

```powershell
npm ci
npm start
```

Do not commit `node_modules`, exported terminal sessions, local settings, credentials, or build output. Keep both package lockfiles when updating dependencies. Packaging dependencies live separately in `tools/packaging` so normal development installs stay smaller.

## Checks

```powershell
npm run format
npm run check
npm run test:smoke
```

The smoke test runs actual Windows PowerShell and CMD sessions in a hidden Electron window. It uses isolated app settings, disables PowerShell profile loading and persistent PSReadLine history, and starts shells in the Windows system directory to keep personal paths out of screenshots. It runs a local mock interactive CLI; no AI account or API key is needed. Results go in `test-results/source/`.

For packaging or native dependency changes, also run:

```powershell
npm run dist
npm run test:packaged
```

`test:packaged` runs the same checks against `release/win-unpacked/Triangle Terminal.exe`. See [releasing](docs/RELEASING.md) for portable distribution.

## Code and Persian text

- Use UTF-8 and the checked-in Prettier/EditorConfig settings.
- Keep privileged operations in the main process and validate IPC arguments and senders.
- Add English and Persian labels together. Preserve Unicode logical order, ZWNJ, punctuation, and mixed-language input.
- Test command input separately from shaped output. Correct-looking text is not enough if the receiving process gets different bytes.
- Preserve normal shell and foreground-program behavior. Do not run staged AI shortcuts automatically.
- Add meaningful regression coverage for behavioral fixes; documentation-only edits do not need new tests.

Contributions are provided under the repository's MIT license. Keep discussion respectful, specific, and focused on the work. Do not post private data or credentials in issues.
