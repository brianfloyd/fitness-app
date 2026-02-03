# Migration Notes

## Goal Photo Fields

The `goal_photo` and `goal_photo_mime_type` fields have been added to the `app_settings` table.

### For New Installations
These fields are already included in `schema.sql`, so no migration is needed.

### For Existing Installations
Run the migration script:

```bash
psql -U postgres -d fitness_db -f add_goal_photo.sql
```

Or manually execute:
```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS goal_photo BYTEA,
ADD COLUMN IF NOT EXISTS goal_photo_mime_type VARCHAR(50);
```
