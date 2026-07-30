// Bundles packages/server into a single ESM file (esbuild), vendors its native/runtime
// dependencies, and stages a per-platform Node binary as a Tauri sidecar so the desktop
// build can spawn the backend without requiring Node to be installed on the user's machine.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, chmodSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, '..');
const repoRoot = path.resolve(desktopDir, '..', '..');
const serverEntry = path.join(repoRoot, 'packages', 'server', 'src', 'index.ts');
const sidecarDist = path.join(desktopDir, 'src-tauri', 'sidecar-dist');
const binariesDir = path.join(desktopDir, 'src-tauri', 'binaries');

const EXTERNAL_DEPS = {
  '@fastify/cors': '^10.0.1',
  'better-sqlite3': '^13.0.1',
  fastify: '^5.1.0',
  nanoid: '^5.0.9',
  'socket.io': '^4.8.1',
};

// [rust target triple, node.org platform-arch, sidecar filename, archive is a .zip]
const NODE_TARGETS = [
  ['x86_64-unknown-linux-gnu', 'linux-x64', 'server-x86_64-unknown-linux-gnu', false],
  ['x86_64-pc-windows-msvc', 'win-x64', 'server-x86_64-pc-windows-msvc.exe', true],
  ['x86_64-apple-darwin', 'darwin-x64', 'server-x86_64-apple-darwin', false],
  ['aarch64-apple-darwin', 'darwin-arm64', 'server-aarch64-apple-darwin', false],
];

// Only stage the binary(ies) actually needed for this run — set by CI to the current
// runner's platform so a matrix build doesn't download all 4 (~400MB) every time.
// Unset (the local/manual default) stages every platform, same as before.
const ONLY_TARGET_TRIPLE = process.env.SIDECAR_TARGET_TRIPLE;
const NODE_VERSION = '22.14.0';

function log(msg) {
  console.log(`[prepare-sidecar] ${msg}`);
}

function bundleServer() {
  log('bundling server with esbuild...');
  rmSync(sidecarDist, { recursive: true, force: true });
  mkdirSync(sidecarDist, { recursive: true });

  return esbuild.build({
    entryPoints: [serverEntry],
    outfile: path.join(sidecarDist, 'server.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: Object.keys(EXTERNAL_DEPS),
    banner: { js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);" },
  });
}

function writeSidecarPackageJson() {
  writeFileSync(
    path.join(sidecarDist, 'package.json'),
    JSON.stringify({ name: 'meridian-server', private: true, type: 'module', dependencies: EXTERNAL_DEPS }, null, 2),
  );
}

function installSidecarDeps() {
  log('installing sidecar runtime dependencies...');
  execFileSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: sidecarDist, stdio: 'inherit' });
}

// Native modules (e.g. better-sqlite3) ship prebuilt .node binaries for every platform
// flatly under a "prebuilds" dir. Keeping all of them bloats the bundle and breaks the
// Linux AppImage step: linuxdeploy tries to resolve ELF deps for every .node file it
// finds, including the musl build, and aborts when it can't find musl's libc on a glibc
// host. Prune down to exactly the platforms this app vendors a Node runtime for.
const KEEP_PREBUILDS = new Set(['linux-x64.node', 'win32-x64.node', 'darwin-x64.node', 'darwin-arm64.node']);

function pruneNativePrebuilds(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'prebuilds') {
        for (const file of readdirSync(full)) {
          if (!KEEP_PREBUILDS.has(file)) rmSync(path.join(full, file), { force: true });
        }
      } else if (entry.name !== '.bin') {
        pruneNativePrebuilds(full);
      }
    }
  }
}

async function stageNodeBinary(targetTriple, nodePlatformArch, filename, isZip) {
  const dest = path.join(binariesDir, filename);
  if (existsSync(dest)) {
    log(`${filename} already staged, skipping download`);
    return;
  }

  // Vendor the official prebuilt Node binary for every platform from nodejs.org — plain
  // downloads, no compilation, works the same on any host (dev sandbox or CI runner).
  const ext = isZip ? 'zip' : 'tar.gz';
  const archiveName = `node-v${NODE_VERSION}-${nodePlatformArch}.${ext}`;
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${archiveName}`;
  const tmpDir = path.join(binariesDir, `.tmp-${nodePlatformArch}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  const archivePath = path.join(tmpDir, archiveName);

  log(`downloading ${url} ...`);
  execFileSync('curl', ['-fSL', '-o', archivePath, url], { stdio: 'inherit' });

  if (isZip) {
    execFileSync('unzip', ['-q', archivePath, '-d', tmpDir]);
  } else {
    execFileSync('tar', ['xf', archivePath, '-C', tmpDir]);
  }

  const extractedDir = path.join(tmpDir, `node-v${NODE_VERSION}-${nodePlatformArch}`);
  const srcBinary = isZip ? path.join(extractedDir, 'node.exe') : path.join(extractedDir, 'bin', 'node');
  copyFileSync(srcBinary, dest);
  if (!isZip) chmodSync(dest, 0o755);
  rmSync(tmpDir, { recursive: true, force: true });
  log(`staged ${filename} (vendored from nodejs.org, untested on this platform)`);
}

async function main() {
  mkdirSync(binariesDir, { recursive: true });

  await bundleServer();
  writeSidecarPackageJson();
  installSidecarDeps();
  pruneNativePrebuilds(path.join(sidecarDist, 'node_modules'));

  const targets = ONLY_TARGET_TRIPLE ? NODE_TARGETS.filter(([triple]) => triple === ONLY_TARGET_TRIPLE) : NODE_TARGETS;
  if (ONLY_TARGET_TRIPLE && targets.length === 0) throw new Error(`SIDECAR_TARGET_TRIPLE=${ONLY_TARGET_TRIPLE} matches no known target`);

  for (const [targetTriple, nodePlatformArch, filename, isZip] of targets) {
    await stageNodeBinary(targetTriple, nodePlatformArch, filename, isZip);
  }

  log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
