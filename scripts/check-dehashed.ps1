# scripts/check-dehashed.ps1
# ---------------------------------------------------------------------------
# Connectivity check for the DeHashed v2 API.
#
# Prints the HTTP status, and on success the FIELD NAMES in the response -
# never the values. The provider's schema can therefore be compared against
# DEHASHED_FIELD_CLASSES in lib/sources.js without a single leaked record
# reaching a terminal, a log file or a chat window.
#
# The API key is read from .env.local and never printed; only its length is
# shown, which is enough to tell "pasted" from "pasted with a line break".
#
#   powershell -ExecutionPolicy Bypass -File scripts\check-dehashed.ps1
# ---------------------------------------------------------------------------
param(
  [string]$Email = "esmailkeabanni@gmail.com"
)

$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Host "no .env.local found at $envFile"
  exit 1
}

$line = Get-Content $envFile | Where-Object { $_ -like "DEHASHED_API_KEY=*" } | Select-Object -First 1
if (-not $line) {
  Write-Host "DEHASHED_API_KEY line is missing from .env.local"
  exit 1
}

$key = ($line -split "=", 2)[1].Trim()
if (-not $key) {
  Write-Host "DEHASHED_API_KEY is empty - paste the key after the = and save the file"
  exit 1
}

Write-Host ("key loaded: {0} characters" -f $key.Length)

$headers = @{ "DeHashed-Api-Key" = $key }
$body = @{ query = "email:$Email"; size = 1; de_dupe = $true } | ConvertTo-Json -Compress

try {
  $res = Invoke-WebRequest -Uri "https://api.dehashed.com/v2/search" -Method POST -Headers $headers -ContentType "application/json" -Body $body
  Write-Host ("status {0}" -f $res.StatusCode)

  $data = $res.Content | ConvertFrom-Json
  Write-Host ("top-level keys: {0}" -f (($data.PSObject.Properties.Name) -join ", "))

  $entries = $data.entries
  if (-not $entries) { $entries = $data.results }

  if ($entries -and @($entries).Count -gt 0) {
    $first = @($entries)[0]
    Write-Host ("entry field names: {0}" -f (($first.PSObject.Properties.Name) -join ", "))
    $populated = $first.PSObject.Properties |
      Where-Object { $null -ne $_.Value -and "$($_.Value)" -ne "" } |
      ForEach-Object { $_.Name }
    Write-Host ("populated on this record: {0}" -f ($populated -join ", "))
  } else {
    Write-Host "no entries returned for this address"
  }
} catch {
  $code = $null
  if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
  if ($code) {
    Write-Host ("status {0}" -f $code)
  } else {
    Write-Host ("request failed: {0}" -f $_.Exception.Message)
  }
}
