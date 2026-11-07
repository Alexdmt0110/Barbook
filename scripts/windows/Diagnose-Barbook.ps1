# Read-only. Do not run as administrator. No registry dumps, secrets or network calls.
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
[pscustomobject]@{
    Windows = $os.Caption; Version = $os.Version; Architecture = $os.OSArchitecture
    PowerShell = $PSVersionTable.PSVersion.ToString()
    LogicalCPU = $cpu.NumberOfLogicalProcessors
    RAM_GB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    FreeRAM_GB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
} | Format-List
foreach ($tool in @('node', 'npm.cmd', 'git', 'psql', 'pg_dump', 'pg_restore', 'tailscale')) {
    $command = Get-Command $tool -ErrorAction SilentlyContinue
    if ($command) {
        $version = & $command.Source --version 2>$null
        [pscustomobject]@{ Tool = $tool; Version = ($version -join ' ') }
    } else { [pscustomobject]@{ Tool = $tool; Version = 'Not on PATH (not proof of absence)' } }
}
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
    [pscustomobject]@{ Drive = $_.DeviceID; SizeGB = [math]::Round($_.Size / 1GB, 1); FreeGB = [math]::Round($_.FreeSpace / 1GB, 1) }
} | Format-Table
foreach ($port in @(3000, 5432, 443)) {
    $occupied = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue).Count -gt 0
    [pscustomobject]@{ TCPPort = $port; Occupied = $occupied }
}
# Service names, paths, usernames, IPs and full process command lines are deliberately omitted.
