# Session-local integration. Does not change the user's PowerShell profile.
Import-Module PSReadLine -ErrorAction SilentlyContinue
if (Get-Module PSReadLine) {
    $global:TriangleOriginalPrompt = (Get-Command prompt).ScriptBlock
    function global:prompt {
        [Console]::Write(([char]27).ToString() + ']777;triangle;' + $env:TRIANGLE_SESSION_TOKEN + ';prompt' + [char]7)
        & $global:TriangleOriginalPrompt
    }
    Set-PSReadLineKeyHandler -Chord Enter -ScriptBlock {
        [Console]::Write(([char]27).ToString() + ']777;triangle;' + $env:TRIANGLE_SESSION_TOKEN + ';busy' + [char]7)
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
    }
    Set-PSReadLineKeyHandler -Chord Ctrl+g -BriefDescription TriangleUnicodeSend -ScriptBlock {
        if ([IO.File]::Exists($env:TRIANGLE_INPUT_FILE)) {
            $triangleText = [IO.File]::ReadAllText($env:TRIANGLE_INPUT_FILE, [Text.Encoding]::UTF8)
            [IO.File]::Delete($env:TRIANGLE_INPUT_FILE)
            [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
            [Microsoft.PowerShell.PSConsoleReadLine]::Insert($triangleText)
            [Console]::Write(([char]27).ToString() + ']777;triangle;' + $env:TRIANGLE_SESSION_TOKEN + ';busy' + [char]7)
            [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
        }
    }
}
