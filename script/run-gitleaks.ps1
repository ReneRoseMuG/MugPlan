param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

function Resolve-GitleaksPath {
  $gitleaksCmd = Get-Command gitleaks -ErrorAction SilentlyContinue
  if ($gitleaksCmd) {
    return $gitleaksCmd.Source
  }

  $wingetExe = Get-ChildItem `
    -Path "$env:LOCALAPPDATA\\Microsoft\\WinGet\\Packages" `
    -Filter "gitleaks.exe" `
    -Recurse `
    -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

  if ($wingetExe) {
    return $wingetExe
  }

  $localToolDir = Join-Path $env:LOCALAPPDATA "MuGPlan\\tools\\gitleaks"
  $localExe = Join-Path $localToolDir "gitleaks.exe"
  if (Test-Path $localExe) {
    return $localExe
  }

  New-Item -ItemType Directory -Force -Path $localToolDir | Out-Null
  $tempZip = Join-Path $env:TEMP "gitleaks_windows_x64.zip"
  $tempExtract = Join-Path $env:TEMP "gitleaks_extract"

  try {
    $release = Invoke-RestMethod `
      -Uri "https://api.github.com/repos/gitleaks/gitleaks/releases/latest" `
      -Headers @{ "User-Agent" = "MuGPlan-Review-Script" } `
      -ErrorAction Stop

    $asset = $release.assets |
      Where-Object { $_.name -like "*_windows_x64.zip" } |
      Select-Object -First 1

    if (-not $asset) {
      throw "No windows_x64 release asset found"
    }

    Invoke-WebRequest `
      -Uri $asset.browser_download_url `
      -OutFile $tempZip `
      -Headers @{ "User-Agent" = "MuGPlan-Review-Script" } `
      -ErrorAction Stop

    if (Test-Path $tempExtract) {
      Remove-Item -Path $tempExtract -Recurse -Force
    }

    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

    $downloadedExe = Get-ChildItem `
      -Path $tempExtract `
      -Filter "gitleaks.exe" `
      -Recurse `
      -ErrorAction Stop |
      Select-Object -First 1 -ExpandProperty FullName

    if (-not $downloadedExe) {
      throw "gitleaks.exe not found in downloaded archive"
    }

    Copy-Item -Path $downloadedExe -Destination $localExe -Force
    return $localExe
  }
  catch {
    Write-Error "gitleaks executable not found and auto-download failed. Install manually (winget/choco) or add gitleaks to PATH. Details: $($_.Exception.Message)"
    exit 1
  }
  finally {
    if (Test-Path $tempZip) {
      Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path $tempExtract) {
      Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

$gitleaksExe = Resolve-GitleaksPath
& $gitleaksExe @Args
exit $LASTEXITCODE
