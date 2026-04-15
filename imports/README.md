# Imports

This directory holds raw source images plus a reviewable manifest before anything is written into Supabase.

## Workflow

1. Put exported source photos into `imports/images/`.
2. Generate or refresh the draft manifest:

```bash
node scripts/generate-import-manifest.mjs imports/images imports/manifest.json "Shared album intake"
```

3. Review `imports/manifest.json` and change entries you want to import:
   - Set `import_status` to `"approved"`
   - Fill in `item_name`, `category`, `room`, `tags`, `source_job_name`, etc.
   - Or auto-approve all rows that already have an `item_name`:

```bash
node scripts/approve-annotated-manifest-items.mjs imports/manifest.json
```
4. Import only approved rows into Supabase:

```bash
node scripts/import-manifest-to-supabase.mjs imports/manifest.json
```

5. Optional dry run before the real upload:

```bash
node scripts/import-manifest-to-supabase.mjs imports/manifest.json --dry-run
```

## Notes

- The importer uses `.env.local` from the repo root.
- It skips any manifest rows not marked `"approved"`.
- It skips rows already marked `"imported"`.
- On a real import, it writes `imported_at`, `imported_item_id`, and `imported_storage_path` back into the manifest so the process can resume safely.
- It creates missing warehouse locations by name.
- It creates or reuses intake batches by `batch_name`.
