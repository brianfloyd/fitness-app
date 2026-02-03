#!/usr/bin/env node
/**
 * Fitness MCP Server — PostgreSQL query and update tools for the Fitness app.
 * Schema: app_settings, daily_logs. See docs/20-04-database-schema.md.
 *
 * Loads backend/.env for DB_* or DATABASE_URL. Cursor runs this via stdio.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { dbTools, handleDbTool } from './tools/db.js';

const server = new Server(
  { name: 'fitness-db', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: dbTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (dbTools.some((t) => t.name === name)) {
      return await handleDbTool(name, args);
    }
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fitness MCP server (stdio) running');
}

main().catch((e) => {
  console.error('Fitness MCP failed:', e);
  process.exit(1);
});
