# Fitness MCP Server — PostgreSQL tools

MCP server that exposes **query** and **update** tools for the Fitness app PostgreSQL database (`app_settings`, `daily_logs`). Use from Cursor so the AI can inspect and modify DB state directly.

## Setup

1. **Install deps** (from project root):
   ```bash
   cd mcp && npm install && cd ..
   ```

2. **DB config**  
   Loads `backend/.env` (same as the API). Uses `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. You can override via the MCP server `env` in `.cursor/mcp.json` if needed.

3. **Cursor**  
   Project-level config is in `.cursor/mcp.json`. Cursor uses it when this project is open. Restart Cursor or reload MCP if you add or change the server.

## Tools

| Tool | Description |
|------|-------------|
| `fitness_db_query` | Run a **SELECT** query. Use `$1`, `$2`… and pass `params` array. Returns rows as JSON. |
| `fitness_db_execute` | Run **INSERT** / **UPDATE** / **DELETE**. Parameterized only. Blocks DROP, TRUNCATE, ALTER. |
| `fitness_db_get_tables` | List tables, or columns for a given table (`app_settings`, `daily_logs`). |
| `fitness_get_logs` | Fetch `daily_logs` (no photo BYTEA). Optional `limit`, `startDate`, `endDate`. |
| `fitness_get_settings` | Fetch `app_settings` (no goal_photo BYTEA). |

## Examples

- **List tables:**  
  `fitness_db_get_tables`  
  or `fitness_db_get_tables` with `{ "tableName": "daily_logs" }`.

- **Query logs:**  
  `fitness_db_query` with  
  `{ "query": "SELECT id, date, weight, fat_percent FROM daily_logs ORDER BY date DESC LIMIT 5" }`.

- **Query with params:**  
  `fitness_db_query` with  
  `{ "query": "SELECT * FROM daily_logs WHERE date >= $1 AND date <= $2", "params": ["2025-01-01", "2025-01-31"] }`.

- **Update:**  
  `fitness_db_execute` with  
  `{ "query": "UPDATE app_settings SET total_days = $1 WHERE id = $2", "params": [84, 1] }`.

## Canon

- **Schema:** `docs/20-04-database-schema.md`  
- **PostgreSQL setup:** `docs/50-01-postgresql-setup.md`

## Structure

```
mcp/
├── index.js      # MCP server (stdio)
├── db.js         # pg pool, loads backend/.env
├── tools/
│   └── db.js     # fitness_db_* tools
├── package.json
└── README.md
```
