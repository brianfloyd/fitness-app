/**
 * Fitness MCP tools: query and update PostgreSQL (app_settings, daily_logs).
 * Canon: docs/20-04-database-schema.md, docs/50-01-postgresql-setup.md
 */

import * as db from '../db.js';

export const dbTools = [
  {
    name: 'fitness_db_query',
    description: 'Execute a SELECT query on the Fitness app PostgreSQL database. Returns rows as JSON. Use parameterized queries ($1, $2) and pass params array.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL SELECT query. Only SELECT allowed.',
        },
        params: {
          type: 'array',
          description: 'Query parameters for $1, $2, etc.',
          items: {},
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fitness_db_execute',
    description: 'Execute INSERT, UPDATE, or DELETE on the Fitness app database. Use parameterized queries ($1, $2) and pass params. DROP/TRUNCATE/ALTER are blocked.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL INSERT, UPDATE, or DELETE query.',
        },
        params: {
          type: 'array',
          description: 'Query parameters for $1, $2, etc.',
          items: {},
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fitness_db_get_tables',
    description: 'List tables in the Fitness database, or columns for a specific table (e.g. app_settings, daily_logs).',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Optional. Table name to get column info for (e.g. daily_logs, app_settings).',
        },
      },
    },
  },
  {
    name: 'fitness_get_logs',
    description: 'Get daily_logs rows. Excludes photo BYTEA for brevity. Optional limit and date range.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max rows (default 50).',
        },
        startDate: {
          type: 'string',
          description: 'Filter date >= YYYY-MM-DD.',
        },
        endDate: {
          type: 'string',
          description: 'Filter date <= YYYY-MM-DD.',
        },
      },
    },
  },
  {
    name: 'fitness_get_settings',
    description: 'Get app_settings. Excludes goal_photo BYTEA.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export async function handleDbTool(name, args) {
  try {
    switch (name) {
      case 'fitness_db_query': {
        const { query: q, params = [] } = args || {};
        const t = (q || '').trim();
        if (!t.toLowerCase().startsWith('select')) {
          return {
            content: [{ type: 'text', text: 'Only SELECT allowed. Use fitness_db_execute for INSERT/UPDATE/DELETE.' }],
            isError: true,
          };
        }
        const rows = await db.query(t, params);
        return {
          content: [{ type: 'text', text: `Rows: ${rows.length}\n${JSON.stringify(rows, null, 2)}` }],
        };
      }

      case 'fitness_db_execute': {
        const { query: q, params = [] } = args || {};
        const raw = (q || '').trim();
        const t = raw.toLowerCase();
        if (t.startsWith('select')) {
          return {
            content: [{ type: 'text', text: 'Use fitness_db_query for SELECT.' }],
            isError: true,
          };
        }
        if (/drop\s|truncate\s|alter\s/i.test(raw)) {
          return {
            content: [{ type: 'text', text: 'DROP, TRUNCATE, and ALTER are not allowed.' }],
            isError: true,
          };
        }
        const { rowCount } = await db.execute(raw, params);
        return {
          content: [{ type: 'text', text: `Done. Rows affected: ${rowCount}` }],
        };
      }

      case 'fitness_db_get_tables': {
        const { tableName } = args || {};
        if (tableName) {
          const cols = await db.query(
            `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = $1
             ORDER BY ordinal_position`,
            [tableName]
          );
          return {
            content: [{ type: 'text', text: `Columns for ${tableName}:\n${JSON.stringify(cols, null, 2)}` }],
          };
        }
        const tables = await db.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
        );
        return {
          content: [{ type: 'text', text: 'Tables:\n' + tables.map((r) => r.table_name).join('\n') }],
        };
      }

      case 'fitness_get_logs': {
        const { limit = 50, startDate, endDate } = args || {};
        let q = `SELECT id, date, day_number, photo_mime_type, weight, fat_percent, workout, protein, fat, carbs, foods, sleep_time, sleep_score, strava, steps, created_at, updated_at FROM daily_logs`;
        const params = [];
        const where = [];
        if (startDate) {
          params.push(startDate);
          where.push(`date >= $${params.length}`);
        }
        if (endDate) {
          params.push(endDate);
          where.push(`date <= $${params.length}`);
        }
        if (where.length) q += ' WHERE ' + where.join(' AND ');
        q += ' ORDER BY date DESC';
        params.push(Math.min(limit, 500));
        q += ` LIMIT $${params.length}`;
        const rows = await db.query(q, params);
        return {
          content: [{ type: 'text', text: `Logs: ${rows.length}\n${JSON.stringify(rows, null, 2)}` }],
        };
      }

      case 'fitness_get_settings': {
        const rows = await db.query(
          `SELECT id, total_days, start_date, goal_photo_mime_type, created_at, updated_at FROM app_settings ORDER BY id DESC LIMIT 1`
        );
        return {
          content: [{ type: 'text', text: rows.length ? JSON.stringify(rows[0], null, 2) : 'No app_settings.' }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (e) {
    return {
      content: [{ type: 'text', text: `DB error: ${e.message}` }],
      isError: true,
    };
  }
}
