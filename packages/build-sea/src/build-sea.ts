// Builds a Single Executable Application (SEA) for Findarr.
//
// Flow:
//   1. Build the shared package, the API (tsc) and the web frontend (vite).
//   2. Bundle the API into a single CommonJS file with esbuild, keeping native
//      addons (better-sqlite3, @node-rs/argon2) external.
//   3. Copy those native packages + the web build next to the bundle so the
//      executable can load them at runtime.
//   4. Generate the SEA blob and inject it into a copy of the node binary.
//   5. add the WinSW service wrapper + install/uninstall scripts.
//   6. Package the output into a versioned, arch-named release zip.
//
// Usage: pnpm run build:sea  (from the repo root)

import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

import { build, type Plugin } from 'esbuild';

type NodeRequire = ReturnType<typeof createRequire>;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const packageDir = path.resolve(import.meta.dirname, '..');
const rootDir = path.resolve(packageDir, '..', '..');
const outDir = path.join(rootDir, 'build', 'sea');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// Release naming: 'win' | 'darwin' | 'linux' and the CPU arch (e.g. x64/arm64).
const platformName = process.platform === 'win32' ? 'win' : process.platform;
const archName = process.arch;

// WinSW (https://github.com/winsw/winsw) wraps findarr.exe as a Windows service.
const winswVersion = 'v2.12.0';
const winswAsset = archName === 'arm64' ? 'WinSW-arm64.exe' : 'WinSW-x64.exe';

const config = {
  packageDir,
  rootDir,
  outDir,
  templatesDir: path.join(packageDir, 'templates'),
  seaConfigFile: path.join(packageDir, 'sea-config.json'),
  bundleFile: path.join(outDir, 'findarr.cjs'),
  blobFile: path.join(outDir, 'findarr.blob'),
  exeFile: path.join(outDir, isWindows ? 'findarr.exe' : 'findarr'),
  // WinSW service wrapper. Its config XML must share the wrapper's base name.
  serviceExe: path.join(outDir, 'findarr-service.exe'),
  winswUrl: `https://github.com/winsw/winsw/releases/download/${winswVersion}/${winswAsset}`,
  winswAsset,
  // Files copied from templates/ next to the executable for service install.
  serviceFiles: ['findarr-service.xml', 'install-service.sh', 'uninstall-service.sh'],
  // Native packages that cannot be bundled and must ship alongside the
  // executable. Their full runtime dependency closure is copied automatically
  // (see copyNativeModules).
  nativePackages: ['better-sqlite3', '@node-rs/argon2'],
  platformName,
  archName,
  isWindows,
  isMac,
};

// Minimal shape of the package.json fields we read.
type PackageManifest = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const toStringRecord = (value: unknown): Record<string, string> => {
  const result: Record<string, string> = {};
  if (typeof value === 'object' && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string') {
        result[key] = val;
      }
    }
  }
  return result;
};

const readManifest = (file: string): PackageManifest => {
  const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof data !== 'object' || data === null) {
    return {};
  }
  const manifest: PackageManifest = {
    dependencies: 'dependencies' in data ? toStringRecord(data.dependencies) : {},
    optionalDependencies:
      'optionalDependencies' in data ? toStringRecord(data.optionalDependencies) : {},
  };
  if ('name' in data && typeof data.name === 'string') {
    manifest.name = data.name;
  }
  if ('version' in data && typeof data.version === 'string') {
    manifest.version = data.version;
  }
  return manifest;
};

const runCommand = (command: string, args: string[], options: ExecFileSyncOptions = {}): void => {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  // pnpm/npx resolve to .cmd shims on Windows and need a shell; the node binary
  // (whose path may contain spaces) must be invoked directly without one.
  const needsShell = config.isWindows && !path.isAbsolute(command);
  execFileSync(command, args, {
    stdio: 'inherit',
    cwd: config.rootDir,
    shell: needsShell,
    ...options,
  });
};

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

// Resolve a package's package.json even when its `exports` map blocks the
// `./package.json` subpath: fall back to resolving the entry and walking up.
const resolvePkgJson = (pkg: string, requirer: NodeRequire): string | null => {
  try {
    return requirer.resolve(`${pkg}/package.json`);
  } catch {
    // Fall through to entry-based resolution.
  }
  let entry: string;
  try {
    entry = requirer.resolve(pkg);
  } catch {
    // Optional dep or platform package for another OS/arch.
    return null;
  }
  let dir = path.dirname(entry);
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate) && readManifest(candidate).name === pkg) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  return null;
};

// Recursively copy a package and its runtime dependency closure into the flat
// output node_modules, dereferencing pnpm's symlinks. `copied` tracks packages
// already handled to avoid duplicate work and cycles.
const copyPackageTree = (pkg: string, requirer: NodeRequire, copied: Set<string>): void => {
  if (copied.has(pkg)) {
    return;
  }
  const pkgJsonPath = resolvePkgJson(pkg, requirer);
  if (pkgJsonPath === null) {
    return;
  }
  copied.add(pkg);

  const src = path.dirname(pkgJsonPath);
  const dest = path.join(config.outDir, 'node_modules', pkg);
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: true });

  const meta = readManifest(pkgJsonPath);
  const deps = { ...meta.dependencies, ...meta.optionalDependencies };
  const childRequire = createRequire(pkgJsonPath);
  for (const dep of Object.keys(deps)) {
    copyPackageTree(dep, childRequire, copied);
  }
};

// The SEA embedder's `require` only resolves builtins, so external native
// packages are routed through a `createRequire` anchored next to the executable.
const createSeaBanner = (): string => `
const __seaPath = require('node:path');
const __seaSea = require('node:sea');
globalThis.__findarrRequire =
  typeof __seaSea.isSea === 'function' && __seaSea.isSea()
    ? require('node:module').createRequire(
        __seaPath.join(__seaPath.dirname(process.execPath), 'findarr.cjs'),
      )
    : require;
`;

// esbuild plugin that leaves the native packages (and sodium-native) unbundled,
// emitting a stub that defers their resolution to the SEA-aware require.
const createSeaExternalPlugin = (): Plugin => {
  const externalPackages = [...config.nativePackages, 'sodium-native'];
  // esbuild uses Go's RE2 engine, which rejects the JS `u` flag on these filters.
  // oxlint-disable-next-line require-unicode-regexp
  const nativeFilter = new RegExp(
    `^(${externalPackages.map((p) => escapeRegExp(p)).join('|')})(/|$)`,
  );
  return {
    name: 'sea-external',
    setup(build_) {
      build_.onResolve({ filter: nativeFilter }, (args) => ({
        path: args.path,
        namespace: 'sea-external',
      }));
      // oxlint-disable-next-line require-unicode-regexp
      build_.onLoad({ filter: /.*/, namespace: 'sea-external' }, (args) => ({
        contents: `module.exports = globalThis.__findarrRequire(${JSON.stringify(args.path)});`,
        loader: 'js',
      }));
    },
  };
};

// ---------------------------------------------------------------------------
// Pipeline phases
// ---------------------------------------------------------------------------

// Clean the output directory.
const cleanOutput = (): void => {
  rmSync(config.outDir, { recursive: true, force: true });
  mkdirSync(config.outDir, { recursive: true });
};

// 1. Build all workspace packages (shared, api, web).
const buildPackages = (): void => {
  runCommand('pnpm', ['run', 'build']);
};

// 2. Bundle the API into a single CommonJS file.
const bundleApi = async (): Promise<void> => {
  await build({
    entryPoints: [path.join(config.rootDir, 'apps', 'api', 'dist', 'index.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    outfile: config.bundleFile,
    banner: { js: createSeaBanner() },
    plugins: [createSeaExternalPlugin()],
    define: { 'import.meta.dirname': '__dirname', 'import.meta.url': '__filename' },
    logLevel: 'info',
  });
};

// 3. Copy the native packages + their full dependency closure next to the
// bundle, dereferencing pnpm's symlinks into a flat node_modules layout.
const copyNativeModules = (): void => {
  const apiRequire = createRequire(path.join(config.rootDir, 'apps', 'api', 'package.json'));
  const copied = new Set<string>();

  for (const pkg of config.nativePackages) {
    copyPackageTree(pkg, apiRequire, copied);
  }

  // sodium-native is nested under @fastify/secure-session, so resolve it from there.
  const secureSessionRequire = createRequire(
    apiRequire.resolve('@fastify/secure-session/package.json'),
  );
  copyPackageTree('sodium-native', secureSessionRequire, copied);
};

// Copy the web frontend build next to the executable.
const copyWebAssets = (): void => {
  cpSync(
    path.join(config.rootDir, 'apps', 'web', 'dist'),
    path.join(config.outDir, 'web', 'dist'),
    { recursive: true },
  );
};

// Copy the Drizzle migrations next to the executable.
const copyDrizzle = (): void => {
  cpSync(path.join(config.rootDir, 'apps', 'api', 'drizzle'), path.join(config.outDir, 'drizzle'), {
    recursive: true,
  });
};

// 4a. Generate the SEA blob from the bundle.
const generateSeaBlob = (): void => {
  runCommand(process.execPath, ['--experimental-sea-config', config.seaConfigFile]);
};

// 4b. Inject the SEA blob into a copy of the node binary.
const injectExecutable = (): void => {
  cpSync(process.execPath, config.exeFile);

  const postjectArgs = [
    'postject',
    config.exeFile,
    'NODE_SEA_BLOB',
    config.blobFile,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ];
  if (config.isMac) {
    postjectArgs.push('--macho-segment-name', 'NODE_SEA');
  }
  runCommand('npx', ['--yes', ...postjectArgs]);
};

// 4c. Remove build intermediates that are not needed at runtime: the esbuild
// bundle and the SEA blob are already baked into the executable.
const cleanupIntermediates = (): void => {
  rmSync(config.bundleFile, { force: true });
  rmSync(config.blobFile, { force: true });
};

// 5a. Download the WinSW service wrapper next to the executable (Windows only).
const downloadWinsw = async (): Promise<void> => {
  if (existsSync(config.serviceExe)) {
    return;
  }
  console.log(`\nDownloading WinSW (${config.winswAsset})…`);
  const response = await fetch(config.winswUrl);
  if (!response.ok) {
    throw new Error(`Failed to download WinSW: ${response.status} ${response.statusText}`);
  }
  writeFileSync(config.serviceExe, Buffer.from(await response.arrayBuffer()));
};

// 5b. Copy the service config + install/uninstall scripts next to the executable.
const copyServiceFiles = (): void => {
  for (const file of config.serviceFiles) {
    cpSync(path.join(config.templatesDir, file), path.join(config.outDir, file));
  }
};

// 6. Package the whole output directory into a release zip named after the
// version, platform and architecture (e.g. findarr-v1.4.4-win-x64.zip).
const packageArchive = (): string => {
  const version = readManifest(path.join(config.rootDir, 'package.json')).version ?? '0.0.0';
  const zipFile = path.join(
    config.rootDir,
    'build',
    `findarr-v${version}-${config.platformName}-${config.archName}.zip`,
  );
  rmSync(zipFile, { force: true });
  if (config.isWindows) {
    // Windows Explorer's built-in zip viewer cannot read bsdtar's zip output,
    // so use PowerShell's Compress-Archive, which produces an Explorer-friendly
    // archive with the folder contents at its root.
    const powershell = String.raw`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`;
    runCommand(powershell, [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      String.raw`Compress-Archive -Path '${config.outDir}\*' -DestinationPath '${zipFile}' -Force`,
    ]);
  } else {
    // bsdtar (macOS) / GNU tar: create the zip from the output directory.
    runCommand('tar', ['-a', '-c', '-f', zipFile, '-C', config.outDir, '.']);
  }
  return zipFile;
};

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const main = async (): Promise<void> => {
  cleanOutput();
  buildPackages();
  await bundleApi();
  copyNativeModules();
  copyWebAssets();
  copyDrizzle();
  generateSeaBlob();
  injectExecutable();
  cleanupIntermediates();

  if (config.isWindows) {
    await downloadWinsw();
    copyServiceFiles();
  }
  const zipFile = packageArchive();

  console.log(`\n✅ Built ${config.exeFile}`);
  console.log(`📦 Release archive: ${zipFile}`);
  if (config.isWindows) {
    console.log('   Includes findarr-service.exe + install-service.sh / uninstall-service.sh.');
  }
};

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
}
