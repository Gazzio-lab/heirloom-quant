# Static runtime data

Files placed here are bundled by electron-builder via `extraResources`
and are available at runtime under `process.resourcesPath/data/`.

This is the place for:
- Larger lookup tables (mortality, §7520 history) that you don't want
  bundled into the JS asar archive.
- User-overridable JSON tables.
