# Starts only the application, in the foreground. Does not install, migrate or enable Serve.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$backend = Join-Path $root 'backend'
$entry = Join-Path $backend 'dist/main.js'
$frontend = Join-Path $root 'frontend/dist/frontend/browser'
if (!(Test-Path $entry -PathType Leaf) -or !(Test-Path (Join-Path $frontend 'index.html') -PathType Leaf)) {
    throw 'Builds missing. Follow the release preparation procedure first.'
}
if (!(Test-Path (Join-Path $root '.env') -PathType Leaf)) { throw 'Private root .env missing.' }
$node = (Get-Command node -ErrorAction Stop).Source
# Environment values take precedence over .env. Preserve the caller environment on exit.
$previous = @{}
foreach ($key in @('NODE_ENV', 'LISTEN_HOST', 'FRONTEND_DIST_DIR')) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
    $env:NODE_ENV = 'production'
    $env:LISTEN_HOST = '127.0.0.1'
    $env:FRONTEND_DIST_DIR = $frontend
    Push-Location $backend
    try {
        Write-Host 'Barbook foreground session. Ctrl+C stops this application. Enable Serve separately only after local checks.'
        & $node $entry
        if ($LASTEXITCODE -ne 0) { throw 'Application stopped with an error. Inspect the local console; do not publish secrets.' }
    } finally { Pop-Location }
} finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
}
