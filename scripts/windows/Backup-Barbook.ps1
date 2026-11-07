# Explicit backup only. No database creation, restoration, secret printing or deletion.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [ValidatePattern('^barbook_[a-z0-9_]+$')][string]$Database = 'barbook_beta',
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-z_][a-z0-9_]*$')][string]$UserName,
    [ValidateRange(1,65535)][int]$Port = 5432
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$output = (Resolve-Path $OutputDirectory).Path
$prefix = $root.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
if ($output -eq $root -or $output.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Backup destination must be outside the repository.' }
$dump = (Get-Command pg_dump -ErrorAction Stop).Source
$restore = (Get-Command pg_restore -ErrorAction Stop).Source
# PostgreSQL uses the already configured, protected pgpass file. Never pass a password argument.
$id = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ') + '-' + [guid]::NewGuid().ToString('N')
$partial = Join-Path $output ("barbook-$id.partial")
$final = Join-Path $output ("barbook-$id.dump")
& $dump --host=127.0.0.1 --port=$Port --username=$UserName --dbname=$Database --no-password --format=custom --file=$partial
if ($LASTEXITCODE -ne 0) { throw 'Backup failed. Partial file retained for local diagnosis; no valid backup announced.' }
& $restore --list $partial *> $null
if ($LASTEXITCODE -ne 0 -or (Get-Item $partial).Length -eq 0) { throw 'Backup archive check failed.' }
Move-Item -LiteralPath $partial -Destination $final -ErrorAction Stop
(Get-FileHash -Algorithm SHA256 -LiteralPath $final).Hash | Set-Content -LiteralPath ($final + '.sha256') -Encoding ascii
Write-Host "Backup created: barbook-$id.dump. Archive listing is not a restoration test."
# No automatic retention deletion: approve exact retention and capacity after the Windows diagnosis.
