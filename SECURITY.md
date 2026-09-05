# Security

Triangle Terminal is a local terminal, not a sandbox for commands. Shells and AI CLIs run with the current user's access. Review commands as you would in PowerShell or CMD.

Only the latest preview is maintained. There is no security-response SLA yet.

## Reporting a vulnerability

Use the repository's **Security → Report a vulnerability** option when private vulnerability reporting is enabled. Include affected versions, a minimal reproduction, impact, and any suggested fix. Do not include real API keys or private terminal sessions.

If that option is unavailable, open an issue requesting a private contact channel **without exploit details**. The maintainer should enable private vulnerability reporting before announcing a public release; see [GitHub preparation](docs/GITHUB.md).

## Boundaries and data

- The Electron renderer is sandboxed, has no Node integration, uses context isolation, and accesses native functions through validated IPC.
- Browser navigation and new windows are blocked. No remote page, HTTP shell endpoint, or telemetry service is built into Triangle.
- Shell output and editor drafts stay in memory unless exported or copied. Settings persist locally.
- At a PowerShell prompt, the Unicode bridge briefly stores submitted text in a temporary file and deletes it when consumed or during normal session cleanup. An abnormal crash can leave a pending file. Avoid submitting secrets as shell commands; shell/CLI history is outside Triangle's control.
- AI tools have their own authentication, network behavior, permissions, and histories. Triangle does not enforce their policies.
- Preview Windows binaries are unsigned. Release downloads should include SHA-256 checksums. Signing and automatic updates are not configured.
