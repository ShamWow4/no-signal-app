<#
.SYNOPSIS
    Automated Reconnaissance Pipeline (Dirhunt -> Photon -> Dirsearch) with Markdown reporting.

.DESCRIPTION
    Runs three open-source reconnaissance tools consecutively against a target URL,
    captures each tool's findings, and compiles everything into a single Markdown
    report (Recon_Report.md) in the workspace folder.

    IMPORTANT: Only run this against systems you own or are explicitly authorized
    to test. Unauthorized scanning of third-party systems may be illegal.

.NOTES
    Requirements (must be installed and on your PATH, or configured below):
      - Python 3          (for Photon)
      - Dirhunt           (pip install dirhunt)
      - Dirsearch         (git clone https://github.com/maurosoria/dirsearch)
      - Photon            (git clone https://github.com/s0md3v/Photon)
#>

# =====================================================================
# 1. CONFIGURATION  --  edit these values
# =====================================================================
$TargetURL   = "https://example.com"      # <-- CHANGE to your target
$PhotonPath  = "C:\ScrapingTools\Photon"   # <-- CHANGE to your Photon folder
$DirsearchPath = ""                       # optional: e.g. "C:\Tools\dirsearch" (leave blank if 'dirsearch' is on PATH)

# =====================================================================
# 2. SETUP WORKSPACE
# =====================================================================
$ErrorActionPreference = "Continue"
$Domain   = ($TargetURL -replace 'https?://', '' -replace 'www\.', '' -replace '/.*', '')
$Workspace = Join-Path $HOME "Desktop\Recon_$Domain"

Write-Host "`nCreating workspace folder at: $Workspace" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
Set-Location $Workspace

# Track results for the final report
$Report = [ordered]@{
    Target      = $TargetURL
    Domain      = $Domain
    RunTime     = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    Workspace   = $Workspace
    Phases      = @()
}

function Add-Phase {
    param([string]$Name, [string]$Status, [string]$OutputFile, [string]$Notes)
    $Report.Phases += [pscustomobject]@{
        Phase      = $Name
        Status     = $Status
        OutputFile = $OutputFile
        Notes      = $Notes
    }
}

# =====================================================================
# 3. PHASE 1 -- Passive Recon (Dirhunt)
# =====================================================================
Write-Host "`n[+] Launching Phase 1: Passive Recon (Dirhunt)..." -ForegroundColor Green
$Phase1Out = "1_dirhunt_directories.txt"

try {
    dirhunt $TargetURL 2>&1 | Out-File -FilePath $Phase1Out -Encoding utf8
    $p1Status = if ($LASTEXITCODE -eq $null -or $LASTEXITCODE -eq 0) { "Completed" } else { "Completed (exit $LASTEXITCODE)" }
    Write-Host "[OK] Phase 1 Complete -> $Phase1Out" -ForegroundColor Cyan
    Add-Phase "Dirhunt (Passive Recon)" $p1Status $Phase1Out "Directory & SSL history scan"
} catch {
    Write-Host "[!] Phase 1 failed: $_" -ForegroundColor Red
    Add-Phase "Dirhunt (Passive Recon)" "Failed" $Phase1Out $_.ToString()
}

# =====================================================================
# 4. PHASE 2 -- Code Intelligence (Photon)
# =====================================================================
Write-Host "`n[+] Launching Phase 2: JS & Secret Extraction (Photon)..." -ForegroundColor Green
$Phase2Out = "2_photon_output"

if (Test-Path "$PhotonPath\photon.py") {
    try {
        python "$PhotonPath\photon.py" -u $TargetURL -o $Phase2Out 2>&1 | Out-File -FilePath "2_photon_console.txt" -Encoding utf8
        $p2Status = if ($LASTEXITCODE -eq $null -or $LASTEXITCODE -eq 0) { "Completed" } else { "Completed (exit $LASTEXITCODE)" }
        Write-Host "[OK] Phase 2 Complete -> $Phase2Out" -ForegroundColor Cyan
        Add-Phase "Photon (Code Intelligence)" $p2Status $Phase2Out "Backend scripts, API keys, site architecture"
    } catch {
        Write-Host "[!] Phase 2 failed: $_" -ForegroundColor Red
        Add-Phase "Photon (Code Intelligence)" "Failed" $Phase2Out $_.ToString()
    }
} else {
    Write-Host "[!] Error: Photon script not found at $PhotonPath. Skipping Phase 2." -ForegroundColor Red
    Add-Phase "Photon (Code Intelligence)" "Skipped" $Phase2Out "Photon script not found at $PhotonPath"
}

# =====================================================================
# 5. PHASE 3 -- Hidden Path Dictionary Scan (Dirsearch)
# =====================================================================
Write-Host "`n[+] Launching Phase 3: Hidden Path Dictionary Scan (Dirsearch)..." -ForegroundColor Green
$Phase3Out = "3_dirsearch_bruteforce.txt"

# Resolve the dirsearch command (folder + python, or a bare 'dirsearch' on PATH)
if ($DirsearchPath -ne "" -and (Test-Path "$DirsearchPath\dirsearch.py")) {
    $DirsearchExe  = "python"
    $DirsearchArgs = @("$DirsearchPath\dirsearch.py")
} else {
    $DirsearchExe  = "dirsearch"
    $DirsearchArgs = @()
}
$DirsearchArgs += @("-u", $TargetURL, "-e", "php,txt,zip,conf,env,git", "--format=plain", "-o", $Phase3Out)

try {
    & $DirsearchExe @DirsearchArgs 2>&1 |
        Out-File -FilePath "3_dirsearch_console.txt" -Encoding utf8
    $p3Status = if ($LASTEXITCODE -eq $null -or $LASTEXITCODE -eq 0) { "Completed" } else { "Completed (exit $LASTEXITCODE)" }
    Write-Host "[OK] Phase 3 Complete -> $Phase3Out" -ForegroundColor Cyan
    Add-Phase "Dirsearch (Brute-Force Paths)" $p3Status $Phase3Out "High-value file scan (.env, .git, .zip, configs)"
} catch {
    Write-Host "[!] Phase 3 failed: $_" -ForegroundColor Red
    Add-Phase "Dirsearch (Brute-Force Paths)" "Failed" $Phase3Out $_.ToString()
}

# =====================================================================
# 6. COMPILE MARKDOWN REPORT
# =====================================================================
Write-Host "`n[+] Compiling Markdown report..." -ForegroundColor Green

function Get-FilePreview {
    param([string]$Path, [int]$MaxLines = 200)
    if (-not (Test-Path $Path)) { return "_(File not found: $Path)_`n" }
    $lines = Get-Content $Path -ErrorAction SilentlyContinue | Select-Object -First $MaxLines
    if (-not $lines) { return "_(No output captured.)_`n" }
    $preview = $lines -join "`n"
    if ((Get-Content $Path).Count -gt $MaxLines) {
        $preview += "`n... (truncated, full output in $Path)"
    }
    return $preview
}

$ReportPath = Join-Path $Workspace "Recon_Report.md"

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine("# Reconnaissance Report")
[void]$md.AppendLine("")
[void]$md.AppendLine("| Field | Value |")
[void]$md.AppendLine("|---|---|")
[void]$md.AppendLine("| Target | $($Report.Target) |")
[void]$md.AppendLine("| Domain | $($Report.Domain) |")
[void]$md.AppendLine("| Run Time | $($Report.RunTime) |")
[void]$md.AppendLine("| Workspace | $($Report.Workspace) |")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Execution Summary")
[void]$md.AppendLine("")
[void]$md.AppendLine("| Phase | Status | Output File | Notes |")
[void]$md.AppendLine("|---|---|---|---|")
foreach ($p in $Report.Phases) {
    [void]$md.AppendLine("| $($p.Phase) | $($p.Status) | $($p.OutputFile) | $($p.Notes) |")
}
[void]$md.AppendLine("")

# Phase 1 detail
[void]$md.AppendLine("## Phase 1 - Dirhunt (Passive Recon)")
[void]$md.AppendLine("")
[void]$md.AppendLine("Found directories and SSL/history intelligence:")
[void]$md.AppendLine("")
[void]$md.AppendLine("``````")
[void]$md.AppendLine((Get-FilePreview "1_dirhunt_directories.txt"))
[void]$md.AppendLine("``````")
[void]$md.AppendLine("")

# Phase 2 detail
[void]$md.AppendLine("## Phase 2 - Photon (Code Intelligence)")
[void]$md.AppendLine("")
$photonSummary = Join-Path $Workspace "$Phase2Out"
if (Test-Path $photonSummary) {
    [void]$md.AppendLine("Photon output files in the `$($Phase2Out)` folder:")
    [void]$md.AppendLine("")
    $photonFiles = Get-ChildItem -Path $photonSummary -Recurse -File -ErrorAction SilentlyContinue
    foreach ($f in $photonFiles) {
        [void]$md.AppendLine("### $($f.Name)")
        [void]$md.AppendLine("")
        [void]$md.AppendLine("``````")
        [void]$md.AppendLine((Get-FilePreview $f.FullName 100))
        [void]$md.AppendLine("``````")
        [void]$md.AppendLine("")
    }
    if ($photonFiles.Count -eq 0) {
        [void]$md.AppendLine("_(No files produced in Photon output folder.)_")
    }
} else {
    [void]$md.AppendLine("_(Photon output folder not found - phase may have been skipped or failed.)_")
}
[void]$md.AppendLine("")
[void]$md.AppendLine("Console output:")
[void]$md.AppendLine("")
[void]$md.AppendLine("``````")
[void]$md.AppendLine((Get-FilePreview "2_photon_console.txt"))
[void]$md.AppendLine("``````")
[void]$md.AppendLine("")

# Phase 3 detail
[void]$md.AppendLine("## Phase 3 - Dirsearch (Hidden Path Dictionary Scan)")
[void]$md.AppendLine("")
[void]$md.AppendLine("Discovered high-value files and paths:")
[void]$md.AppendLine("")
[void]$md.AppendLine("``````")
[void]$md.AppendLine((Get-FilePreview "3_dirsearch_bruteforce.txt"))
[void]$md.AppendLine("``````")
[void]$md.AppendLine("")

[void]$md.AppendLine("---")
[void]$md.AppendLine("_Generated by the Automated Reconnaissance Pipeline. Use only against systems you own or are authorized to test._")

$md.ToString() | Out-File -FilePath $ReportPath -Encoding utf8

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "Pipeline Execution Complete!" -ForegroundColor Green
Write-Host "Findings stored in: $Workspace" -ForegroundColor Green
Write-Host "Markdown report:    $ReportPath" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
