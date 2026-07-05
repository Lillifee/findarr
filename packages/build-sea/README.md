# @findarr/build-sea

Builds Findarr as a **Single Executable Application (SEA)** — a native binary that
bundles the API server and serves the web UI without requiring Node.js to be
installed on the target machine.

## Usage

Run from the repository root:

```bash
pnpm run build:sea
# or directly:
vp run -r build:sea
```

The output is written to `build/sea/` at the repository root, and a ready-to-ship
release archive is written to `build/`:

```
build/
  findarr-v<version>-<platform>-<arch>.zip   # <- upload this to a GitHub release
  sea/
    findarr.exe            # the executable (findarr on macOS/Linux) — this is what you run
    node_modules/          # native modules + their dependency closure
    web/dist/              # built web frontend
    drizzle/               # database migrations
    findarr-service.exe    # WinSW service wrapper           (Windows only)
    findarr-service.xml    # service configuration           (Windows only)
    install-service.sh     # install as a Windows service    (Windows only)
    uninstall-service.sh   # remove the Windows service      (Windows only)
```

The zip name encodes the version and the machine it was built on, e.g.
`findarr-v1.4.4-win-x64.zip`, so release assets are easy to identify.

> The bundle (`findarr.cjs`) and SEA blob (`findarr.blob`) are build
> intermediates — they are baked into `findarr.exe` and then deleted at the end
> of the build.

> **Shipping:** distribute the executable **together with the sibling
> `node_modules/`, `web/`, and `drizzle/` folders.** The release zip already
> contains everything laid out correctly — just extract and run.

## Running the executable

Directly:

```bash
NODE_ENV=production PORT=8585 DATA_PATH=./data ./findarr.exe
```

- `NODE_ENV=production` is **required** for the binary to serve the web UI.
- `DATA_PATH` is where the SQLite database and session secret are created.

## Installing as a Windows service

The Windows build bundles [WinSW](https://github.com/winsw/winsw) as
`findarr-service.exe` plus a `findarr-service.xml` config. From an **elevated
(Administrator)** terminal, inside the extracted folder:

```bash
./install-service.sh     # installs "Findarr" and starts it (auto-starts on boot)
./uninstall-service.sh   # stops and removes the service (keeps ./data)
```

Defaults: `PORT=8585`, `DATA_PATH=%BASE%\data`. Edit `findarr-service.xml` before
installing to change the port, host, or data location. Service logs are written
next to the executable (`findarr-service.out.log` / `.err.log`).

## Building & releasing

Because the binary embeds **platform-specific native modules** and the current
Node binary, **you build on (or for) the target OS/arch** — a Windows `.exe` must
be produced on a Windows x64 machine (or a matching CI runner, e.g. GitHub
Actions `windows-latest`). You cannot build a Windows executable from a Linux
runner without a cross-build toolchain, so a plain Linux CI job won't work.

After building, upload `build/findarr-v<version>-<platform>-<arch>.zip` to the
GitHub release. To produce builds for multiple platforms, run `build:sea` on a
runner for each target and upload each zip.

## How it works

The build runs as a small pipeline (see [`src/build-sea.ts`](src/build-sea.ts)):

1. **buildPackages** – builds `shared`, `api` (tsc) and `web` (Vite) via
   `pnpm run build`.
2. **bundleApi** – esbuild bundles the compiled API into a single CommonJS file.
   SEA requires CommonJS, so the entry cannot use top-level `await`.
3. **copyNativeModules** – native addons and their full runtime dependency
   closure are copied next to the bundle (see below).
4. **copyWebAssets / copyDrizzle** – the web build and DB migrations are copied
   alongside the executable.
5. **generateSeaBlob / injectExecutable** – Node generates the SEA blob from
   [`sea-config.json`](sea-config.json) and `postject` injects it into a copy of
   the Node binary.
6. **downloadWinsw / copyServiceFiles** – on Windows, the WinSW wrapper is
   downloaded and the service config + install/uninstall scripts are copied in.
7. **packageArchive** – the output folder is zipped into
   `build/findarr-v<version>-<platform>-<arch>.zip`.

### Native modules

`better-sqlite3`, `@node-rs/argon2` and `sodium-native` are native addons and
cannot be embedded in the SEA blob. They are kept **external** in the bundle and
their `.node` binaries (plus their transitive dependency closure) are copied into
`build/sea/node_modules/`. At runtime the bundle resolves them through a
`createRequire` anchored next to the executable (see `createSeaBanner`).

Because the native binaries are platform-specific, **the executable is built for
the current OS/arch only.**

## Why esbuild instead of `vp pack --exe`?

vite+ ships an experimental `pack --exe` (tsdown SEA) option, but it is not a good
fit for this app:

- It requires **Node ≥ 25.7.0**.
- It still cannot embed the three native addons — the dependency-closure copying
  in this package would be needed regardless.
- Using its embedded-asset support would require rewriting the static file server
  and the Drizzle migration loader to read via `node:sea` `getAsset()`.

The esbuild-based pipeline here handles the native modules and on-disk assets
directly, which is simpler and more robust for this project.
