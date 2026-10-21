import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildWindowsSupervisorSource } from '../worker-launch-ack.js';

describe('generated Windows worker supervisor', () => {
  it('keeps PowerShell line endings and C# literals valid across JavaScript generation', () => {
    const source = buildWindowsSupervisorSource();

    expect(source).toContain('\n');
    expect(source).not.toContain('`n');
    expect(source).toContain(String.raw`if (c == '\\')`);
    expect(source).toContain('[uint32]::MaxValue');
    expect(source).not.toContain('[uint32]0xffffffff');
    expect(source).toContain('[O]::ReadLineAsync()');
    expect(source).toContain('Task.Run(() => Console.In.ReadLine())');
    expect(source).toContain('$payloadLine = [WorkerLaunchInput]::ReadLineAsync().GetAwaiter().GetResult()');
    expect(source).not.toContain('[System.Threading.Tasks.Task]::Run([System.Func[string]]');
    expect(source).toContain('CreateFileW("CONIN$",');
    expect(source).toContain('CreateFileW("CONOUT$",');
    expect(source).toContain('new IntPtr(0x20002)');
    expect(source).toContain('StartupInfo.hStdInput = input');
    expect(source).toContain('StartupInfo.hStdOutput = output');
    expect(source).toContain('true, 0x00000004 | 0x00000400 | 0x00080000');
    expect(source).toContain('exit_code=$exitCode');
    expect(source).toContain('New-ProviderLaunchInvocation');
    expect(source).toContain("Replace('%', '%%%%')");
    expect(source).toContain('chcp 65001 >nul');
    expect(source).toContain(String.raw` /s /c ""`);

  });

  it.runIf(process.platform === 'win32')('compiles in PowerShell 5.1 and launches a native batch provider through its generated wrapper', () => {
    // Parse the actual generated script, then execute its Add-Type commands.
    // This catches script delimiters and layered C# escaping, then exercises
    // the generated cmd.exe command line against an isolated provider shim.
    const harness = String.raw`
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'Expected Windows PowerShell 5.1' }
$source = [Console]::In.ReadToEnd()
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { $diagnostics = $errors | ForEach-Object { "line $($_.Extent.StartLineNumber):$($_.Extent.StartColumnNumber) $($_.Message)" }; throw ($diagnostics -join '; ') }
$commands = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Add-Type' }, $true))
if ($commands.Count -ne 2) { throw 'Expected bootstrap input and supervisor Add-Type commands' }
foreach ($command in $commands) { Invoke-Expression $command.Extent.Text }
$helpers = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and ($node.Name -eq 'Quote-ProviderCmdArgument' -or $node.Name -eq 'New-ProviderLaunchInvocation') }, $true))
if ($helpers.Count -ne 2) { throw 'Expected batch-provider wrapper helpers' }
foreach ($helper in $helpers) { Invoke-Expression $helper.Extent.Text }
$originalTemp = $env:TEMP
$helperRoot = Join-Path $env:TEMP ('omc supervisor batch test Ω ' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($helperRoot) | Out-Null
$env:TEMP = $helperRoot
$batchPath = $null
$process = $null
try {
  $providerPath = Join-Path $helperRoot 'codex.cmd'
  $providerScript = '@echo off' + [char]13 + [char]10 + '"%OMC_TEST_NODE_EXE%" -e "require(''fs'').writeFileSync(process.argv[1],JSON.stringify(process.argv.slice(2)))" "%~dp0argv.json" %*' + [char]13 + [char]10 + 'exit /b 37' + [char]13 + [char]10
  [IO.File]::WriteAllText($providerPath, $providerScript, [Text.Encoding]::ASCII)
  $payloadArgv = [string[]]@('100% ready', '%USERPROFILE%', 'bang!', 'caret^', 'say "hello" & continue', 'two words', 'Grüße-λ-漢字')
  $providerArgv = [string[]]@($providerPath) + $payloadArgv
  $launch = New-ProviderLaunchInvocation -ProviderArgv $providerArgv -SystemRoot $env:SystemRoot -TempRoot $helperRoot -TempEnvironmentVariable 'TEMP'
  $batchPath = $launch.batch_path
  if ($launch.provider_argv.Count -ne 8) { throw 'Expected the validated provider argv to remain intact' }
  if ($launch.application_path -ne (Join-Path $env:SystemRoot 'System32\cmd.exe')) { throw 'Expected absolute System32 cmd.exe' }
  if ($launch.command_line -notmatch ' /s /c ""%TEMP%\\omc-worker-[0-9a-f]+\.cmd""$') { throw "Expected cmd.exe /s /c quoting without CRT-escaped quotes; command line: $($launch.command_line)" }
  if ($launch.command_line.Contains('\\"')) { throw 'Expected cmd.exe command tail to avoid CRT quote escaping' }
  $batch = [IO.File]::ReadAllText($batchPath)
  foreach ($literal in @('chcp 65001 >nul', '100%%%% ready', '%%%%USERPROFILE%%%%', 'bang!', 'caret^', 'say ""hello"" & continue', 'two words', 'Grüße-λ-漢字')) {
    if (-not $batch.Contains($literal)) { throw "Batch wrapper lost literal argument: $literal; batch content: $batch" }
  }
  $cleanupAnchor = 'if defined _OMC_OLD_CODEPAGE chcp %_OMC_OLD_CODEPAGE% >nul'
  if (-not $batch.Contains($cleanupAnchor)) { throw 'Generated wrapper lost code-page restoration line' }
  $batch = $batch.Replace($cleanupAnchor, $cleanupAnchor + [char]13 + [char]10 + 'echo cleanup> "%TEMP%\cleanup.marker"')
  [IO.File]::WriteAllText($batchPath, $batch, [Text.UTF8Encoding]::new($false))
  $expectedProviderInvocation = 'call ' + (@($providerArgv | ForEach-Object { Quote-ProviderCmdArgument ([string]$_) }) -join ' ')
  if (-not $batch.Contains($expectedProviderInvocation)) { throw "Batch wrapper lost provider invocation line; expected: $expectedProviderInvocation; batch content: $batch" }
  $prefix = [O]::BuildCommandLine([string[]]@($launch.application_path))
  if (-not $launch.command_line.StartsWith($prefix + ' ', [StringComparison]::Ordinal)) { throw 'Expected application path prefix in command line' }
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $launch.application_path
  $startInfo.Arguments = $launch.command_line.Substring($prefix.Length + 1)
  $startInfo.WorkingDirectory = $helperRoot
  $startInfo.UseShellExecute = $false
  $process = [System.Diagnostics.Process]::Start($startInfo)
  if (-not $process.WaitForExit(15000)) { $process.Kill(); throw 'Generated cmd.exe provider wrapper timed out' }
  if ($process.ExitCode -ne 37) { throw "Expected provider exit code 37, got $($process.ExitCode); generated command line: $($launch.command_line); expanded command line: $($launch.command_line.Replace('%TEMP%', $helperRoot)); batch content: $batch" }
  if (-not [IO.File]::Exists((Join-Path $helperRoot 'cleanup.marker'))) { throw 'Generated wrapper did not reach cleanup after provider exit' }
  $actualArgv = [IO.File]::ReadAllText((Join-Path $helperRoot 'argv.json')) | ConvertFrom-Json
  if ($actualArgv.PSObject.Properties.Name -contains 'value' -and $actualArgv.PSObject.Properties.Name -contains 'Count') { $actualArgv = $actualArgv.value }
  $actualArgv = @($actualArgv)
  if ($actualArgv.Count -ne $payloadArgv.Count) { throw "Generated wrapper changed provider argv count; expected: $($payloadArgv.Count); actual: $($actualArgv.Count); batch content: $batch" }
  for ($i = 0; $i -lt $payloadArgv.Count; $i++) {
    if ([string]$actualArgv[$i] -cne [string]$payloadArgv[$i]) { throw "Generated wrapper changed provider argv at index $i; expected: $($payloadArgv[$i]); actual: $($actualArgv[$i]); batch content: $batch" }
  }
  $exePath = Join-Path $env:SystemRoot 'System32\cmd.exe'
  $exeLaunch = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@($exePath, '--version')) -SystemRoot $env:SystemRoot
  if ($exeLaunch.batch_path -or $exeLaunch.provider_argv.Count -ne 2 -or $exeLaunch.application_path -ne $exePath) { throw 'Expected executable argv to pass through unchanged' }
  $invalidPathRejected = $false
  try { $null = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@('codex.cmd')) -SystemRoot $env:SystemRoot }
  catch { if ($_.Exception.Message -ne 'worker_launch_provider_executable_invalid') { throw }; $invalidPathRejected = $true }
  if (-not $invalidPathRejected) { throw 'Expected relative batch provider path to be rejected' }
  $invalidArgumentRejected = $false
  $invalidArgument = 'line' + [char]13 + [char]10 + 'two'
  try { $null = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@($providerPath, $invalidArgument)) -SystemRoot $env:SystemRoot -TempRoot $helperRoot -TempEnvironmentVariable 'TEMP' }
  catch { if ($_.Exception.Message -ne 'worker_launch_provider_argv_invalid') { throw }; $invalidArgumentRejected = $true }
  if (-not $invalidArgumentRejected) { throw 'Expected CRLF-bearing batch argument to be rejected' }
  $comPath = Join-Path $helperRoot 'codex.com'
  [System.IO.File]::WriteAllText($comPath, 'not a native executable')
  $comLaunch = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@($comPath, '--version')) -SystemRoot $env:SystemRoot -TempRoot $helperRoot -TempEnvironmentVariable 'TEMP'
  if ($comLaunch.batch_path -or $comLaunch.application_path -ne $comPath -or $comLaunch.provider_argv.Count -ne 2) { throw 'Expected .com provider argv to pass through unchanged' }
  $comPi = New-Object O+PROCESS_INFORMATION
  try { [O]::CreateConsoleProcess($comLaunch.application_path, ('"' + $comLaunch.application_path + '" --version'), [IntPtr]::Zero, $env:SystemRoot, [ref]$comPi) }
  catch {
    if ($_.Exception.InnerException -is [ArgumentException] -and $_.Exception.InnerException.Message -eq 'worker_launch_provider_executable_invalid') { throw 'Resolved .com provider was rejected before native process creation' }
  } finally {
    if ($comPi.hProcess -ne [IntPtr]::Zero) {
      if (-not [O]::TerminateProcess($comPi.hProcess, 1)) { throw 'Failed to terminate .com validation test process' }
      if ([O]::WaitForSingleObject($comPi.hProcess, 5000) -ne 0) { throw '.com validation test process did not terminate' }
      [O]::CloseHandle($comPi.hProcess) | Out-Null
    }
    if ($comPi.hThread -ne [IntPtr]::Zero) { [O]::CloseHandle($comPi.hThread) | Out-Null }
  }
} finally {
  if ($process) { if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() }; $process.Dispose() }
  if ($batchPath) { Remove-Item -LiteralPath $batchPath -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $helperRoot -Recurse -Force -ErrorAction SilentlyContinue
  $env:TEMP = $originalTemp
}
$invalidProviders = @('codex', '.\codex.exe', 'C:codex.exe', '\codex.exe', ($env:SystemRoot + '\System32\codex.cmd'), ($env:SystemRoot + '\System32\codex'), ($env:SystemRoot + '\System32\omc-nonexistent-provider.exe'))
foreach ($app in $invalidProviders) {
  $pi = New-Object O+PROCESS_INFORMATION
  $rejected = $false
  try { [O]::CreateConsoleProcess($app, $app, [IntPtr]::Zero, $env:SystemRoot, [ref]$pi) }
  catch {
    if ($_.Exception.InnerException -isnot [ArgumentException] -or $_.Exception.InnerException.Message -ne 'worker_launch_provider_executable_invalid') { throw }
    $rejected = $true
  }
  if (-not $rejected -or $pi.hProcess -ne [IntPtr]::Zero) { throw 'Invalid provider was not rejected before native process creation' }
}
[O]::BuildCommandLine([string[]]@('', 'plain', 'space value', 'a"b', 'C:\dir with space\')) | ConvertTo-Json -Compress
`;
    const output = execFileSync(
      join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(harness, 'utf16le').toString('base64')],
      { input: buildWindowsSupervisorSource(), encoding: 'utf8', windowsHide: true, timeout: 30_000, env: { ...process.env, OMC_TEST_NODE_EXE: process.execPath } },
    );
    expect(JSON.parse(output.trim())).toBe(String.raw`"" "plain" "space value" "a\"b" "C:\dir with space\\"`);
  }, 35_000);
});
