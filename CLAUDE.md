# CLAUDE.md

## Server conventions

- **Database writes:** Always use `saveData` from [packages/server/utils/db/saveData.js](packages/server/utils/db/saveData.js) for inserts and updates. Do not call Prisma `create`/`update` directly.
  - Insert: `saveData({ model: "quiz", data })` returns the new id
  - Update: `saveData({ model: "quiz", id, data })`
  - Bulk insert: pass an array as `data`
  - Inside a transaction: pass `tx`
  - Non-`id` primary key: pass `idColumn`
