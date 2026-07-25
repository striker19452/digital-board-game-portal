param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("start", "status", "stop")]
    [string]$Action
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"
$LogRoot = Join-Path $RuntimeRoot "logs"
$StatePath = Join-Path $RuntimeRoot "processes.json"
$ManifestRoot = Join-Path $ProjectRoot "src\games"
$CondaPath = "D:\miniconda3\Scripts\conda.exe"

function Get-IsoCreationDate {
    param([int]$ProcessId)
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if ($null -eq $processInfo) { return $null }
    return ([DateTime]$processInfo.CreationDate).ToUniversalTime().ToString("o")
}

function Test-SameProcess {
    param(
        [int]$ProcessId,
        $CreationDate
    )
    $currentDate = Get-IsoCreationDate -ProcessId $ProcessId
    if ($null -eq $currentDate -or $null -eq $CreationDate) {
        return $false
    }
    $expected = if ($CreationDate -is [DateTime]) {
        $CreationDate.ToUniversalTime()
    }
    else {
        [DateTimeOffset]::Parse([string]$CreationDate).UtcDateTime
    }
    $actual = [DateTime]::Parse($currentDate).ToUniversalTime()
    return [Math]::Abs(($expected - $actual).TotalSeconds) -lt 2
}

function Get-PortOwner {
    param([int]$Port)
    foreach ($line in (& netstat.exe -ano -p tcp)) {
        $parts = @($line.Trim() -split "\s+" | Where-Object { $_ })
        if ($parts.Count -lt 5 -or $parts[0] -ne "TCP") { continue }
        if ($parts[1] -notmatch ":(\d+)$" -or [int]$Matches[1] -ne $Port) {
            continue
        }
        if ($parts[2] -notin @("0.0.0.0:0", "[::]:0")) { continue }
        if ($parts[-1] -match "^\d+$") { return [int]$parts[-1] }
    }
    return $null
}

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 20
    )
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $task = $client.ConnectAsync("127.0.0.1", $Port)
            if ($task.Wait(200) -and $client.Connected) {
                $client.Dispose()
                return Get-PortOwner -Port $Port
            }
        }
        catch {
            # The service is still starting.
        }
        finally {
            $client.Dispose()
        }
        Start-Sleep -Milliseconds 250
    }
    return $null
}

function Read-RuntimeState {
    if (-not (Test-Path -LiteralPath $StatePath)) { return @() }
    try {
        $state = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
        if ($null -eq $state.services) { return @() }
        return @($state.services)
    }
    catch {
        Write-Warning "运行状态文件无法读取，将忽略旧状态。"
        return @()
    }
}

function Write-RuntimeState {
    param([array]$Records)
    New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
    $payload = [ordered]@{
        version = 1
        updatedAt = [DateTime]::UtcNow.ToString("o")
        services = @($Records)
    }
    $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $StatePath -Encoding utf8
}

function Get-CommandPath {
    param([string]$Name)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw "找不到命令：$Name"
    }
    return $command.Source
}

function Get-ServiceDefinitions {
    $services = @(
        [pscustomobject]@{
            id = "portal"
            title = "数字桌游馆"
            runtime = "vite"
            workingDirectory = $ProjectRoot
            port = 4173
            path = "/"
        }
    )

    $manifests = Get-ChildItem -LiteralPath $ManifestRoot -Filter "*.json" -File |
        Sort-Object Name
    foreach ($manifestFile in $manifests) {
        $manifest = Get-Content -Raw -LiteralPath $manifestFile.FullName | ConvertFrom-Json
        if ($null -eq $manifest.launch.local) { continue }
        $directory = [System.IO.Path]::GetFullPath(
            (Join-Path $ProjectRoot ([string]$manifest.launch.local.directory))
        )
        $services += [pscustomobject]@{
            id = [string]$manifest.id
            title = [string]$manifest.title
            runtime = [string]$manifest.launch.local.runtime
            workingDirectory = $directory
            port = [int]$manifest.launch.local.port
            path = [string]$manifest.launch.local.path
        }
    }
    return $services
}

function Test-RecordRunning {
    param($Record)
    if ($null -eq $Record) { return $false }
    $listenerPid = [int]$Record.listenerPid
    if (-not (Test-SameProcess -ProcessId $listenerPid -CreationDate $Record.listenerCreationDate)) {
        return $false
    }
    return (Get-PortOwner -Port ([int]$Record.port)) -eq $listenerPid
}

function Get-DescendantProcessIds {
    param([int]$RootProcessId)
    $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
    $result = [System.Collections.Generic.List[int]]::new()
    $queue = [System.Collections.Generic.Queue[int]]::new()
    $queue.Enqueue($RootProcessId)

    while ($queue.Count -gt 0) {
        $parent = $queue.Dequeue()
        foreach ($child in $allProcesses | Where-Object { [int]$_.ParentProcessId -eq $parent }) {
            $childId = [int]$child.ProcessId
            $result.Add($childId)
            $queue.Enqueue($childId)
        }
    }
    $ordered = @($result)
    [array]::Reverse($ordered)
    return $ordered
}

function Stop-ServiceRecord {
    param($Record)
    $rootPid = [int]$Record.rootPid
    $listenerPid = [int]$Record.listenerPid
    $rootValid = Test-SameProcess -ProcessId $rootPid -CreationDate $Record.rootCreationDate
    $listenerValid = Test-SameProcess -ProcessId $listenerPid -CreationDate $Record.listenerCreationDate

    if ($rootValid) {
        foreach ($childId in (Get-DescendantProcessIds -RootProcessId $rootPid)) {
            Stop-Process -Id $childId -Force -ErrorAction SilentlyContinue
        }
        Stop-Process -Id $rootPid -Force -ErrorAction SilentlyContinue
    }
    elseif ($listenerValid) {
        foreach ($childId in (Get-DescendantProcessIds -RootProcessId $listenerPid)) {
            Stop-Process -Id $childId -Force -ErrorAction SilentlyContinue
        }
        Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
    }
}

function New-LaunchSpec {
    param($Service)
    switch ($Service.runtime) {
        "static" {
            if (-not (Test-Path -LiteralPath $CondaPath)) {
                throw "找不到 Conda：$CondaPath"
            }
            return [pscustomobject]@{
                filePath = $CondaPath
                arguments = @(
                    "run", "-n", "agent", "python", "-m", "http.server",
                    [string]$Service.port, "--bind", "0.0.0.0",
                    "--directory", [string]$Service.workingDirectory
                )
                environment = @{}
            }
        }
        "vite" {
            return [pscustomobject]@{
                filePath = Get-CommandPath -Name "pnpm.cmd"
                arguments = @(
                    "exec", "vite", "--host", "0.0.0.0",
                    "--port", [string]$Service.port, "--strictPort"
                )
                environment = @{}
            }
        }
        "node" {
            return [pscustomobject]@{
                filePath = Get-CommandPath -Name "npm.cmd"
                arguments = @("start")
                environment = @{
                    HOST = "0.0.0.0"
                    PORT = [string]$Service.port
                }
            }
        }
        default {
            throw "不支持的运行时：$($Service.runtime)"
        }
    }
}

function Start-ServiceDefinition {
    param($Service)
    $launch = New-LaunchSpec -Service $Service
    $stdoutPath = Join-Path $LogRoot "$($Service.id).out.log"
    $stderrPath = Join-Path $LogRoot "$($Service.id).err.log"
    $startParameters = @{
        FilePath = $launch.filePath
        ArgumentList = $launch.arguments
        WorkingDirectory = $Service.workingDirectory
        WindowStyle = "Hidden"
        PassThru = $true
        RedirectStandardOutput = $stdoutPath
        RedirectStandardError = $stderrPath
    }
    if ($launch.environment.Count -gt 0) {
        $startParameters.Environment = $launch.environment
    }

    $process = Start-Process @startParameters
    $rootCreationDate = Get-IsoCreationDate -ProcessId $process.Id
    $listenerPid = Wait-ForPort -Port $Service.port
    if ($null -eq $listenerPid) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        $tail = ""
        if (Test-Path -LiteralPath $stderrPath) {
            $tail = (Get-Content -LiteralPath $stderrPath -Tail 12) -join [Environment]::NewLine
        }
        throw "$($Service.title) 未能在端口 $($Service.port) 启动。`n$tail"
    }

    return [pscustomobject]@{
        id = $Service.id
        title = $Service.title
        port = $Service.port
        path = $Service.path
        workingDirectory = $Service.workingDirectory
        rootPid = $process.Id
        rootCreationDate = $rootCreationDate
        listenerPid = $listenerPid
        listenerCreationDate = Get-IsoCreationDate -ProcessId $listenerPid
        startedAt = [DateTime]::UtcNow.ToString("o")
    }
}

$definitions = @(Get-ServiceDefinitions)
$existingRecords = @(Read-RuntimeState)

if ($Action -eq "status") {
    Write-Output "本地桌游服务状态"
    foreach ($service in $definitions) {
        $record = $existingRecords | Where-Object { $_.id -eq $service.id } | Select-Object -First 1
        if (Test-RecordRunning -Record $record) {
            Write-Output ("[运行中] {0,-20} http://127.0.0.1:{1}{2}" -f $service.title, $service.port, $service.path)
        }
        elseif ($null -ne (Get-PortOwner -Port $service.port)) {
            Write-Output ("[被占用] {0,-20} 端口 {1} 由未跟踪进程占用" -f $service.title, $service.port)
        }
        else {
            Write-Output ("[未运行] {0,-20} 端口 {1}" -f $service.title, $service.port)
        }
    }
    exit 0
}

if ($Action -eq "stop") {
    if ($existingRecords.Count -eq 0) {
        Write-Output "没有由门户启动器记录的服务。"
        exit 0
    }
    foreach ($record in $existingRecords) {
        if (Test-RecordRunning -Record $record) {
            Write-Output "停止 $($record.title)..."
            Stop-ServiceRecord -Record $record
        }
        else {
            Write-Output "跳过 $($record.title)：记录已失效或进程不匹配。"
        }
    }
    if (Test-Path -LiteralPath $StatePath) {
        $removed = $false
        for ($attempt = 1; $attempt -le 10; $attempt += 1) {
            try {
                Remove-Item -LiteralPath $StatePath -Force
                $removed = $true
                break
            }
            catch {
                Start-Sleep -Milliseconds 250
            }
        }
        if (-not $removed -and (Test-Path -LiteralPath $StatePath)) {
            Write-Warning "状态文件正被同步工具占用，已保留为失效记录；下次启动会安全覆盖它。"
        }
    }
    Write-Output "本地桌游服务已停止。"
    exit 0
}

foreach ($service in $definitions) {
    if (-not (Test-Path -LiteralPath $service.workingDirectory -PathType Container)) {
        throw "项目目录不存在：$($service.workingDirectory)"
    }
}

New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
$finalRecords = [System.Collections.Generic.List[object]]::new()
$newRecords = [System.Collections.Generic.List[object]]::new()

try {
    foreach ($service in $definitions) {
        $existing = $existingRecords | Where-Object { $_.id -eq $service.id } | Select-Object -First 1
        $portOwner = Get-PortOwner -Port $service.port
        if ($null -ne $portOwner) {
            if (Test-RecordRunning -Record $existing) {
                Write-Output "复用 $($service.title)，端口 $($service.port)。"
                $finalRecords.Add($existing)
                continue
            }
            throw "端口 $($service.port) 已被未跟踪进程占用，无法启动 $($service.title)。"
        }

        Write-Output "启动 $($service.title)，端口 $($service.port)..."
        $record = Start-ServiceDefinition -Service $service
        $newRecords.Add($record)
        $finalRecords.Add($record)
    }

    Write-RuntimeState -Records $finalRecords
}
catch {
    foreach ($record in $newRecords) {
        Stop-ServiceRecord -Record $record
    }
    throw
}

Write-Output ""
Write-Output "数字桌游馆已启动："
Write-Output "  本机入口  http://127.0.0.1:4173/"
Write-Output "  局域网入口请使用本机 IPv4 地址和端口 4173。"
Write-Output "  查看状态  pnpm local:status"
Write-Output "  停止服务  pnpm local:stop"
