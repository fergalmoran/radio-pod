#!/bin/sh
set -e
bun run db:migrate
exec bun run server.prod.ts
