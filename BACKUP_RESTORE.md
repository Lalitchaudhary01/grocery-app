# Backup and Restore

## Prerequisites
- `pg_dump` and `psql` available on server.
- `DATABASE_URL` exported in shell.

## Create backup
```bash
chmod +x scripts/create-backup.sh
DATABASE_URL="postgresql://..." scripts/create-backup.sh
```

Output is saved in `backups/` as compressed `.sql.gz`.

## Restore backup
```bash
chmod +x scripts/restore-backup.sh
DATABASE_URL="postgresql://..." scripts/restore-backup.sh backups/grocery-YYYYMMDD-HHMMSS.sql.gz
```

## Recommended schedule
- Daily full backup at 2:00 AM server time.
- Keep last 14 daily backups + last 8 weekly backups.

## Safety notes
- Run restore only on maintenance window.
- Verify by checking latest orders/products counts after restore.

