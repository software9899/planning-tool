# Production Fix Guide: Bookmarks 500 Error

## Problem
Production backend (http://68.183.227.173:8002) returns 500 error when creating bookmarks because the `bookmarks.tags` column uses `ARRAY(Text)` type which is causing compatibility issues.

## Solution
Convert `bookmarks.tags` from `ARRAY(Text)` to `JSONB` type.

---

## Step-by-Step Fix

### Option 1: Using Migration Script (Recommended)

1. **SSH into production server:**
   ```bash
   ssh user@68.183.227.173
   ```

2. **Navigate to backend directory:**
   ```bash
   cd /path/to/backend
   ```

3. **Set production database URL:**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:5432/database_name"
   ```

4. **Run migration script:**
   ```bash
   python migrate_bookmarks_tags.py
   ```

5. **Restart backend service:**
   ```bash
   # If using systemd:
   sudo systemctl restart planning-tool-backend

   # If using docker:
   docker restart backend-container

   # If using PM2:
   pm2 restart backend
   ```

---

### Option 2: Manual SQL Migration

1. **Connect to production database:**
   ```bash
   psql postgresql://user:password@host:5432/database_name
   ```

2. **Create backup:**
   ```sql
   CREATE TABLE bookmarks_backup_tags AS SELECT * FROM bookmarks;
   ```

3. **Migrate column type:**
   ```sql
   ALTER TABLE bookmarks
   ALTER COLUMN tags TYPE JSONB
   USING CASE
       WHEN tags IS NULL THEN NULL
       ELSE to_jsonb(tags)
   END;
   ```

4. **Verify migration:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'bookmarks' AND column_name = 'tags';
   ```

   Should show: `tags | jsonb`

5. **Exit psql and restart backend service**

---

## Verification

After migration and restart, test the API:

```bash
curl -X POST http://68.183.227.173:8002/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Bookmark",
    "url": "https://example.com",
    "category": "Test",
    "tags": ["test", "demo"]
  }'
```

Should return 200 OK with bookmark data.

---

## Rollback Plan (If Needed)

If something goes wrong:

1. **Restore from backup:**
   ```sql
   DROP TABLE bookmarks;
   ALTER TABLE bookmarks_backup_tags RENAME TO bookmarks;
   ```

2. **Restore indexes and constraints if needed**

---

## Code Changes Made

**File:** `backend/main.py` line 223

**Before:**
```python
tags = Column(ARRAY(Text), nullable=True)
```

**After:**
```python
tags = Column(JSONB, nullable=True, default=list)
```

This change is **backwards compatible** after migration - JSONB can store the same array data as ARRAY(Text).

---

## Important Notes

- ⚠️ **Backup first!** The migration script creates `bookmarks_backup_tags` automatically
- 🔒 **Database permissions:** Make sure the database user has ALTER TABLE permissions
- ⏱️ **Downtime:** Migration should be fast (< 1 second) unless you have millions of bookmarks
- 🔄 **Zero data loss:** All existing tags will be preserved as JSON arrays

---

## Contact

If you encounter any issues, check:
1. Backend logs: `/var/log/planning-tool/backend.log` (or wherever logs are stored)
2. Database connection: `psql -h host -U user -d database`
3. Backend status: `systemctl status planning-tool-backend` or `pm2 status`
