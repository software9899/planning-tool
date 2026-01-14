# แก้ Production แบบง่ายที่สุด ⚡

## วิธีที่ 1: รัน SQL โดยตรง (ง่ายสุด!) 🎯

```bash
# บน production server
psql postgresql://user:password@host:5432/planning_tool -f fix-bookmarks.sql
```

**แค่นี้เอง!** จากนั้น restart backend:
```bash
docker restart <backend-container>
# หรือ
pm2 restart backend
```

---

## วิธีที่ 2: ใช้ Script (ง่ายรองลงมา)

```bash
./fix-production.sh
```

Script จะ:
1. ถามข้อมูล database
2. รัน migration
3. บอกวิธี restart backend

---

## วิธีที่ 3: Manual SQL

```bash
# Connect to database
psql postgresql://user:password@host:5432/planning_tool

# Run SQL
BEGIN;

-- Backup
CREATE TABLE bookmarks_backup_tags AS SELECT * FROM bookmarks;

-- Convert
ALTER TABLE bookmarks
ALTER COLUMN tags TYPE JSONB
USING CASE WHEN tags IS NULL THEN NULL ELSE to_jsonb(tags) END;

COMMIT;

# Exit
\q
```

จากนั้น restart backend

---

## ตรวจสอบว่าสำเร็จ

```bash
# Test API
curl http://68.183.227.173:8002/api/bookmarks

# ควรได้ 200 OK (ไม่ใช่ 500)
```

---

## Rollback (ถ้าผิดพลาด)

```sql
DROP TABLE bookmarks;
ALTER TABLE bookmarks_backup_tags RENAME TO bookmarks;
```

---

## สรุป

| วิธี | ความง่าย | เวลา |
|------|----------|------|
| SQL โดยตรง | ⭐⭐⭐⭐⭐ | 10 วินาที |
| Script | ⭐⭐⭐⭐ | 30 วินาที |
| Docker setup | ⭐⭐ | 5-10 นาที |

**แนะนำ: ใช้วิธีที่ 1 - SQL โดยตรง**
