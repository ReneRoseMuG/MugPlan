param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$gitleaksCmd = Get-Command gitleaks -ErrorAction SilentlyContinue
if ($gitleaksCmd) {
  & $gitleaksCmd.Source @Args
  exit $LASTEXITCODE
}

$wingetExe = Get-ChildItem `
  -Path "$env:LOCALAPPDATA\\Microsoft\\WinGet\\Packages" `
  -Filter "gitleaks.exe" `
  -Recurse `
  -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $wingetExe) {
  Write-Error "gitleaks executable not found. Install it via winget: winget install --id Gitleaks.Gitleaks -e"
  exit 1
}

& $wingetExe @Args
exit $LASTEXITCODE
