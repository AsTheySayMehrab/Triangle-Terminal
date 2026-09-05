# Windows preview releases

Build on Windows x64 with Node.js 22.12 or newer and several GB of free disk space. Packaging tools install from their own lockfile; the already-installed Electron runtime is reused.

```powershell
npm ci
npm run check
npm run test:smoke
npm run dist
npm run test:packaged
```

The build produces `release/Triangle-Terminal-0.1.0-x64.exe` (version follows package.json) and an unpacked application used by the packaged smoke test. `npmRebuild` is disabled because this Windows x64 build uses node-pty's distributed native binaries; the packaged smoke test verifies they load in Electron.

If your project drive is short on space, use `npm run dist -- --output D:\Triangle-build` and test with `npm run test:packaged -- --exe "D:\Triangle-build\win-unpacked\Triangle Terminal.exe"`. Choose a local drive that supports launching sandboxed applications.

## Before publishing

1. Set the version in package.json, refresh the root lockfile with `npm install --package-lock-only`, and update CHANGELOG.md.
2. Verify source and packaged smoke tests pass, including Persian/ZWNJ input, CMD, a foreground mock AI CLI, and app shutdown. Manually check the portable EXE launches, and try the AI tools you intend to claim support for.
3. Use the **Build Windows preview** workflow, or make the local build above. A `v0.1.0` tag also triggers a build, and must match package.json. The workflow does not publish anything.
4. Generate checksums locally if not using the workflow:

```powershell
Get-FileHash -LiteralPath release/Triangle-Terminal-0.1.0-x64.exe -Algorithm SHA256
```

5. Create a GitHub **prerelease**, paste the relevant changelog, and attach the EXE, SHA256SUMS.txt, LICENSE, and THIRD_PARTY_NOTICES.md. The Actions build creates SHA256SUMS.txt automatically.

Clearly state that the build is unsigned, Windows-only, and a preview. Preserve third-party notices. Do not claim universal RTL support or working AI balance reporting. Never upload `test-results/profile`, credentials, private transcripts, or personal screenshots.

Code signing, automatic updates, macOS/Linux packages, and ARM64 distribution are future work. Test those separately before advertising them.
