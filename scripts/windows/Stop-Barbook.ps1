# Explicit operator action: stops only the dedicated Serve mapping, never all Node/PG processes.
[CmdletBinding()]
param([switch]$DisableDedicatedServe)
$ErrorActionPreference = 'Stop'
if ($DisableDedicatedServe) {
    $tailscale = (Get-Command tailscale -ErrorAction Stop).Source
    & $tailscale serve status
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Serve state.' }
    if ((Read-Host 'Confirm HTTPS 443 is dedicated to Barbook: type BARBOOK') -cne 'BARBOOK') { throw 'Cancelled.' }
    & $tailscale serve --https=443 off
    if ($LASTEXITCODE -ne 0) { throw 'Serve was not disabled. Do not assume remote access stopped.' }
}
Write-Host 'Now press Ctrl+C in the Start-Barbook console and wait for shutdown. This script does not terminate foreign processes or stop PostgreSQL.'
