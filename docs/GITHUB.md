# Put Triangle Terminal on GitHub

The repository is prepared locally. Creating a public repository and pushing it are separate actions.

## First upload

1. Create an **empty** GitHub repository named `triangle-terminal`. Do not initialize another README or license there.
2. In this project directory, inspect `git status` and the files to be shared.
3. Use these commands, replacing the remote URL with the exact URL GitHub provides:

```powershell
git add .
git commit -m "Prepare Triangle Terminal 0.1.0 preview"
git remote add origin https://github.com/YOUR-ACCOUNT/triangle-terminal.git
git push -u origin main
```

If Git has no author identity configured, configure your preferred name and email for this repository first. Use your GitHub-provided no-reply email if you want to keep your email private. Do not commit the dependency/build folders; `.gitignore` already excludes them.

The MIT license is included with copyright attributed to Triangle Terminal contributors. Review the license and project attribution before publishing. `private: true` in package.json prevents accidental npm publication; it does not prevent a public GitHub repository.

## Repository settings

- Suggested description: **A customizable Windows terminal for Persian and English developers, with a bilingual editor, AI CLI shortcuts, and live system status.**
- Suggested topics: `terminal`, `persian`, `farsi`, `rtl`, `powershell`, `electron`, `codex`, `developer-tools`.
- Enable Issues, GitHub Actions, Dependabot alerts, and private vulnerability reporting.
- Protect `main` with pull requests and the **Windows checks / check** status check after its first successful run.
- Keep workflow token permissions read-only. Neither checked-in workflow publishes releases or needs API keys.

The README uses relative links and local screenshots, so it works under any GitHub owner without changing badge URLs or account names.

## Share a release

Run **Actions → Build Windows preview → Run workflow**. When the build and packaged tests pass, download the artifact and follow [RELEASING.md](RELEASING.md) to create a GitHub prerelease manually. Upload the EXE and checksums as release assets, not into Git history.
