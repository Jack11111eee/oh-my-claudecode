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
    expect(source).toContain('[System.IO.StreamReader]::new([Console]::OpenStandardInput(), [System.Text.UTF8Encoding]::new($false), $true)');
    expect(source).toContain('[O]::ReadLineAsync()');
    expect(source).not.toContain('System.Console.SetIn(');
    expect(source).not.toContain('WorkerLaunchInput');
    const inputReadyMarker = source.indexOf('[Console]::Out.WriteLine("worker-launch-input-ready-v1"); [Console]::Out.Flush()');
    const initializeInput = source.indexOf('$bootstrapReader = [System.IO.StreamReader]::new(');
    const readBootstrapPayload = source.indexOf('$payloadLine = $bootstrapReader.ReadLine()');
    expect(inputReadyMarker).toBeGreaterThan(source.indexOf('$ErrorActionPreference = "Stop"'));
    expect(initializeInput).toBeGreaterThan(inputReadyMarker);
    expect(readBootstrapPayload).toBeGreaterThan(-1);
    expect(initializeInput).toBeLessThan(readBootstrapPayload);
    expect(readBootstrapPayload).toBeLessThan(source.indexOf('$readTask = [O]::ReadLineAsync()'));
    expect(source).toContain('$payloadLine = $bootstrapReader.ReadLine()');
    expect(readBootstrapPayload).toBeLessThan(source.indexOf('Add-Type @"'));
    expect(source).not.toContain('[System.Threading.Tasks.Task]::Run([System.Func[string]]');
    expect(source).toContain('CreateFileW("CONIN$",');
    expect(source).toContain('CreateFileW("CONOUT$",');
    expect(source).toContain('new IntPtr(0x20002)');
    expect(source).toContain('StartupInfo.hStdInput = input');
    expect(source).toContain('StartupInfo.hStdOutput = output');
    expect(source).toContain('true, 0x00000004 | 0x00000400 | 0x00080000');
    expect(source).toContain('exit_code=$exitCode');
    expect(source).toContain('New-ProviderLaunchInvocation');
    expect(source).toContain('ConvertTo-Json -InputObject @{ argv = @($ProviderArgv) } -Compress');
    expect(source).toContain('$argvEnvelope = ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("__ARGV_BASE64__")))');
    expect(source).toContain('$providerArgv = @($argvEnvelope.argv)');
    expect(source).toContain('$providerArguments = New-Object string[] ($providerArgv.Length - 1)');
    expect(source).toContain('[Array]::Copy($providerArgv, 1, $providerArguments, 0, $providerArguments.Length)');
    expect(source).toContain("if ($providerArguments[$i].Length -eq 0) { $providerArguments[$i] = '\"\"' }");
    expect(source).toContain('[System.Diagnostics.ProcessStartInfo]');
    expect(source).toContain('$startInfo.UseShellExecute = $false');
    expect(source).not.toContain('ConvertTo-Json -InputObject @($ProviderArgv) -Compress');
    expect(source).toContain('function Write-WorkerLaunchStage([string]$stage) { [Console]::Error.WriteLine("worker-launch-stage:" + $stage); [Console]::Error.Flush() }');
    expect(source).toContain('$payload = ConvertFrom-Json -InputObject $payloadLine');
    expect(source).toContain('$authority = ConvertFrom-Json -InputObject $json');
    expect(source).not.toContain('$payloadLine | ConvertFrom-Json');
    expect(source).not.toContain('$json | ConvertFrom-Json');
    expect(source).toContain('if ($hash -ne $expectedDigest) { throw "worker_launch_authority_digest_mismatch" }');
    const parseAndValidationStages = [
      'outer-payload-parse-started',
      'outer-payload-parse-complete',
      'digest-input-started',
      'digest-input-complete',
      'digest-hash-started',
      'digest-hash-complete',
      'digest-compare-started',
      'digest-compare-complete',
      'inner-authority-parse-started',
      'inner-authority-parse-complete',
      'argv-count-validation-started',
      'argv-count-validation-complete',
      'argv-value-validation-started',
      'argv-value-validation-complete',
    ];
    let previousStage = source.indexOf('Write-WorkerLaunchStage "input-payload-read"');
    expect(previousStage).toBeGreaterThan(-1);
    for (const stage of parseAndValidationStages) {
      const stageIndex = source.indexOf(`Write-WorkerLaunchStage "${stage}"`);
      expect(stageIndex).toBeGreaterThan(previousStage);
      previousStage = stageIndex;
    }
    expect(source.indexOf('Write-WorkerLaunchStage "authority-validated"')).toBeGreaterThan(previousStage);
    expect(source).toContain('$startInfo.FileName = $env:ComSpec');
    expect(source).toContain('function Escape-BatchMetachar');
    expect(source).toContain('function Escape-BatchArgument');
    expect(source).toContain('function Escape-BatchCommand');
    expect(source).not.toContain('[Console]::InputEncoding =');
    expect(source).not.toContain('[Console]::OutputEncoding =');
    expect(source).toContain('$startInfo.Arguments');
    expect(source).not.toContain('& $providerPath @providerArguments');
    expect(source).not.toContain('$nestedCommand');
    expect(source).toContain('GetProcessTimes(IntPtr process');
    expect(source).not.toContain('Get-Process -Id');
    expect(source).toContain('QueryInformationJobObject(IntPtr job, int informationClass');
    expect(source).toContain('return information.ActiveProcesses');
    expect(source).toContain('if (-not [O]::CloseHandle($pi.hProcess)) { throw "worker_launch_process_close_failed" }; $pi.hProcess = [IntPtr]::Zero; [O]::WaitForJobEmpty($job, 5000)');
    expect(source).toContain('[O]::WaitForJobEmpty($job, 5000)');
    expect(source).not.toContain('[O]::WaitForSingleObject($job, 5000)');
    const createProvider = source.indexOf('[O]::CreateConsoleProcess(');
    const readStartIdentity = source.indexOf('$ticks = [O]::GetProcessStartTicks($pi.hProcess)');
    const resumeProvider = source.indexOf('[O]::ResumeThread($pi.hThread)');
    const readyFrameWrite = source.indexOf('[Console]::Out.WriteLine($ready); [Console]::Out.Flush()');
    const controlRead = source.indexOf('$readTask = [O]::ReadLineAsync()');
    expect(readStartIdentity).toBeGreaterThan(createProvider);
    expect(readStartIdentity).toBeLessThan(resumeProvider);
    expect(readyFrameWrite).toBeGreaterThan(resumeProvider);
    expect(readyFrameWrite).toBeLessThan(controlRead);

  });

  it.runIf(process.platform === 'win32')('compiles in PowerShell 5.1 and launches a native batch provider through its generated launcher', () => {
    // Parse the actual generated script, then execute its supervisor Add-Type command.
    // This catches script delimiters and layered C# escaping, then exercises
    // the structured PowerShell launcher against an isolated provider shim.
    const harness = String.raw`
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'Expected Windows PowerShell 5.1' }
$source = [Console]::In.ReadToEnd()
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { $diagnostics = $errors | ForEach-Object { "line $($_.Extent.StartLineNumber):$($_.Extent.StartColumnNumber) $($_.Message)" }; throw ($diagnostics -join '; ') }
$commands = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Add-Type' }, $true))
if ($commands.Count -ne 1) { throw 'Expected only the supervisor Add-Type command' }
foreach ($command in $commands) { Invoke-Expression $command.Extent.Text }
$helpers = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'New-ProviderLaunchInvocation' }, $true))
if ($helpers.Count -ne 1) { throw 'Expected batch-provider launcher helper' }
foreach ($helper in $helpers) { Invoke-Expression $helper.Extent.Text }
$originalTemp = $env:TEMP
$helperRoot = Join-Path $env:TEMP ('omc supervisor batch test Ω ' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($helperRoot) | Out-Null
$env:TEMP = $helperRoot
$launcherPath = $null
$process = $null
try {
  $providerPath = Join-Path $helperRoot 'codex.cmd'
  $providerScript = '@echo off' + [char]13 + [char]10 + '"%OMC_TEST_NODE_EXE%" -e "require(''fs'').writeFileSync(process.argv[1],JSON.stringify({argv:process.argv.slice(2)}))" "%~dp0argv.json" %*' + [char]13 + [char]10 + 'exit /b 37' + [char]13 + [char]10
  [IO.File]::WriteAllText($providerPath, $providerScript, [Text.Encoding]::ASCII)
  $payloadArgv = [string[]]@('100% ready', '%USERPROFILE%', 'bang!', 'caret^', 'say "hello" & continue', 'two words', 'Grüße-λ-漢字', '')
  $providerArgv = [string[]]@($providerPath) + $payloadArgv
  $launch = New-ProviderLaunchInvocation -ProviderArgv $providerArgv -SystemRoot $env:SystemRoot -TempRoot $helperRoot -TempEnvironmentVariable 'TEMP'
  $launcherPath = $launch.launcher_path
  if ($launch.provider_argv.Count -ne $providerArgv.Count) { throw "Expected provider argv count $($providerArgv.Count); actual: $($launch.provider_argv.Count)" }
  if ($launch.application_path -ne (Join-Path $PSHOME 'powershell.exe')) { throw 'Expected absolute Windows PowerShell launcher' }
  if ($launch.command_line -match ' /d /v:off /s /c') { throw 'Expected structured launcher without inline CMD argv parsing' }
  foreach ($argument in $payloadArgv) {
    if ($argument.Length -gt 0 -and $launch.command_line.Contains($argument)) { throw 'Launcher command line exposed provider argv' }
  }
  $expectedCommandLine = [O]::BuildCommandLine([string[]]@($launch.application_path, '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $launcherPath))
  if ($launch.command_line -cne $expectedCommandLine) { throw "Unexpected PowerShell launcher command line: $($launch.command_line)" }
  $launcher = [IO.File]::ReadAllText($launcherPath)
  $comspecMatch = [regex]::Match($launcher, '\$env:ComSpec = \[Text.Encoding\]::UTF8.GetString\(\[Convert\]::FromBase64String\("([A-Za-z0-9+/=]+)"\)\)')
  if (-not $comspecMatch.Success) { throw 'Generated launcher lost its explicit command-shell path' }
  $expectedComspec = Join-Path $env:SystemRoot 'System32\cmd.exe'
  if ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($comspecMatch.Groups[1].Value)) -cne $expectedComspec) { throw 'Generated launcher changed the validated command-shell path' }
  $argvMatch = [regex]::Match($launcher, '\$argvEnvelope = ConvertFrom-Json -InputObject \(\[Text.Encoding\]::UTF8.GetString\(\[Convert\]::FromBase64String\("([A-Za-z0-9+/=]+)"\)\)\)')
  if (-not $argvMatch.Success) { throw 'Generated launcher lost its encoded argv payload' }
  $decodedEnvelope = ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($argvMatch.Groups[1].Value)))
  $decodedArgv = [string[]]$decodedEnvelope.argv
  if ($decodedArgv.Count -ne $providerArgv.Count) { throw "Structured launcher changed provider argv count; expected: $($providerArgv.Count); actual: $($decodedArgv.Count)" }
  for ($i = 0; $i -lt $providerArgv.Count; $i++) {
    if ($decodedArgv[$i] -cne $providerArgv[$i]) { throw "Structured launcher changed provider argv at index $i" }
  }
  $expectedInputCodePage = [Console]::InputEncoding.CodePage
  $expectedOutputCodePage = [Console]::OutputEncoding.CodePage
  $prefix = [O]::BuildCommandLine([string[]]@($launch.application_path))
  if (-not $launch.command_line.StartsWith($prefix + ' ', [StringComparison]::Ordinal)) { throw 'Expected application path prefix in command line' }
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $launch.application_path
  $startInfo.Arguments = $launch.command_line.Substring($prefix.Length + 1)
  $startInfo.WorkingDirectory = $helperRoot
  $startInfo.UseShellExecute = $false
  $null = $startInfo.EnvironmentVariables.Remove('ComSpec')
  $process = [System.Diagnostics.Process]::Start($startInfo)
  if (-not $process.WaitForExit(15000)) { $process.Kill(); throw 'Generated PowerShell provider launcher timed out' }
  if ($process.ExitCode -ne 37) { throw "Expected provider exit code 37, got $($process.ExitCode); generated command line: $($launch.command_line)" }
  if ([Console]::InputEncoding.CodePage -ne $expectedInputCodePage -or [Console]::OutputEncoding.CodePage -ne $expectedOutputCodePage) { throw 'Generated launcher changed shared console code pages' }
  $actualArgvEnvelope = ConvertFrom-Json -InputObject ([IO.File]::ReadAllText((Join-Path $helperRoot 'argv.json')))
  $actualArgv = [string[]]$actualArgvEnvelope.argv
  if ($actualArgv.Count -ne $payloadArgv.Count) { throw "Generated launcher changed provider argv count; expected: $($payloadArgv.Count); actual: $($actualArgv.Count)" }
  for ($i = 0; $i -lt $payloadArgv.Count; $i++) {
    if ([string]$actualArgv[$i] -cne [string]$payloadArgv[$i]) { throw "Generated launcher changed provider argv at index $i" }
  }
  $exePath = Join-Path $env:SystemRoot 'System32\cmd.exe'
  $exeLaunch = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@($exePath, '--version')) -SystemRoot $env:SystemRoot
  if ($exeLaunch.launcher_path -or $exeLaunch.provider_argv.Count -ne 2 -or $exeLaunch.application_path -ne $exePath) { throw 'Expected executable argv to pass through unchanged' }
  $invalidPathRejected = $false
  try { $null = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@('codex.cmd')) -SystemRoot $env:SystemRoot }
  catch { if ($_.Exception.Message -ne 'worker_launch_provider_executable_invalid') { throw }; $invalidPathRejected = $true }
  if (-not $invalidPathRejected) { throw 'Expected relative batch provider path to be rejected' }
  foreach ($invalidArgument in @(('carriage' + [char]13 + 'return'), ('line' + [char]10 + 'feed'), ('nul' + [char]0 + 'byte'))) {
    $invalidArgumentRejected = $false
    try { $null = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@($providerPath, $invalidArgument)) -SystemRoot $env:SystemRoot -TempRoot $helperRoot -TempEnvironmentVariable 'TEMP' }
    catch { if ($_.Exception.Message -ne 'worker_launch_provider_argv_invalid') { throw }; $invalidArgumentRejected = $true }
    if (-not $invalidArgumentRejected) { throw 'Expected CR/LF/NUL-bearing batch argument to be rejected' }
  }
  $comPath = Join-Path $helperRoot 'codex.com'
  [System.IO.File]::WriteAllText($comPath, 'not a native executable')
  $comLaunch = New-ProviderLaunchInvocation -ProviderArgv ([string[]]@($comPath, '--version')) -SystemRoot $env:SystemRoot -TempRoot $helperRoot -TempEnvironmentVariable 'TEMP'
  if ($comLaunch.launcher_path -or $comLaunch.application_path -ne $comPath -or $comLaunch.provider_argv.Count -ne 2) { throw 'Expected .com provider argv to pass through unchanged' }
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
  if ($launcherPath) { Remove-Item -LiteralPath $launcherPath -Force -ErrorAction SilentlyContinue }
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
