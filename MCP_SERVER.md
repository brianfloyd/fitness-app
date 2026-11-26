# MCP Server Documentation

This fitness app includes an MCP (Model Context Protocol) server that allows AI assistants to log food, workouts, and body metrics via natural language.

## Overview

The MCP server implements the **MCP Streamable HTTP transport** with **JSON-RPC 2.0** protocol, allowing any standard MCP-compatible client to connect.

**Features:**
- Search for foods (USDA database + custom foods)
- Log food entries with automatic macro calculation
- Get daily nutrition summaries
- List, update, and delete food entries
- Log weight and waist measurements
- Log workouts with exercises and sets
- Log skateboard training sessions

## Protocol

| Property | Value |
|----------|-------|
| Transport | Streamable HTTP |
| Protocol | JSON-RPC 2.0 |
| Version | `2024-11-05` |
| Endpoint | `POST /api/mcp` |
| Auth | `Authorization: Bearer <token>` |

## Authentication

The MCP server uses per-profile API tokens for authentication.

### Generating an API Token

After deployment to Railway, run:

```bash
# SSH into your Railway deployment or use Railway CLI
railway run node src/scripts/generate-api-token.js --email brian@example.com
# or by profile ID:
railway run node src/scripts/generate-api-token.js 1
```

Save the generated token securely - it will only be shown once.

### Using the Token

Add the token to your MCP client configuration as a Bearer token:

```
Authorization: Bearer <your-token>
```

## MCP URL

**Production URL:** `https://fit.brianfloyd.me/api/mcp`

## JSON-RPC Methods

### initialize

Initialize the MCP session.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "my-client", "version": "1.0.0" }
  },
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "fitness-tracker-mcp", "version": "1.0.0" }
  },
  "id": 1
}
```

### tools/list

List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "search_food",
        "description": "Search for foods by name or barcode",
        "inputSchema": { "type": "object", "properties": { ... } }
      },
      // ... more tools
    ]
  },
  "id": 2
}
```

### tools/call

Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "log_food",
    "arguments": {
      "food_name": "chicken breast",
      "quantity": 150,
      "unit": "g"
    }
  },
  "id": 3
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{ \"logged\": { ... }, \"date\": \"2026-11-26\", \"total_entries\": 5 }"
      }
    ]
  },
  "id": 3
}
```

## Available Tools

### search_food
Search for foods by name or barcode.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No* | Food name to search for |
| barcode | string | No* | Barcode (GTIN/UPC) to search |

*At least one of `query` or `barcode` required.

### log_food
Log a food entry for a specific date.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| food_name | string | Yes | Name or description of the food |
| quantity | number | Yes | Amount of food |
| date | string | No | Date (YYYY-MM-DD), defaults to today |
| unit | string | No | Unit (g, oz, serving, cup), defaults to "g" |
| meal | string | No | Meal type (breakfast, lunch, dinner, snack) |
| calories | number | No | Override calories |
| protein | number | No | Override protein (g) |
| fat | number | No | Override fat (g) |
| carbs | number | No | Override carbs (g) |

### get_daily_nutrition
Get nutrition summary for a specific date.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | No | Date (YYYY-MM-DD), defaults to today |

### list_food_entries
List all food entries for a specific date.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | No | Date (YYYY-MM-DD), defaults to today |

### update_food_entry
Update a specific food entry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | Yes | Date (YYYY-MM-DD) |
| entry_index | number | Yes | Index of entry (0-based) |
| quantity | number | No | New amount |
| unit | string | No | New unit |

### delete_food_entry
Delete a specific food entry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | Yes | Date (YYYY-MM-DD) |
| entry_index | number | Yes | Index of entry (0-based) |

### log_weight
Log weight and optional waist measurement.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| weight | number | Yes | Weight in pounds |
| date | string | No | Date (YYYY-MM-DD), defaults to today |
| waist | number | No | Waist measurement in inches |

### log_workout
Log a workout with exercises.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| exercises | array | Yes | Array of exercise objects |
| date | string | No | Date (YYYY-MM-DD), defaults to today |

**Exercise object:**
```json
{
  "name": "Bench Press",
  "muscle_group": "Chest",
  "sets": [
    { "weight": 135, "reps": 10 },
    { "weight": 155, "reps": 8 }
  ]
}
```

**Muscle groups:** Biceps, Triceps, Chest, Back, Shoulders, Legs, Core, Forearms

### log_skate_session
Log a skateboard training session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_type | string | Yes | ldp, scogging, freestyle, long_session, switch_practice |
| date | string | No | Date (YYYY-MM-DD), defaults to today |
| distance_miles | number | No | Distance in miles |
| duration_minutes | number | No | Duration in minutes |
| switch_foot_minutes | number | No | Minutes on switch foot |
| weak_side_comfort | number | No | Comfort level 1-10 |
| notes | string | No | Session notes |

## Connecting as Remote MCP Server

### For Claude Desktop

Add this to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "fitness-tracker": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote-http"],
      "env": {
        "MCP_REMOTE_URL": "https://fit.brianfloyd.me/api/mcp",
        "MCP_REMOTE_AUTH": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}
```

### For Other MCP Clients

Configure an HTTP transport with:
- **URL:** `https://fit.brianfloyd.me/api/mcp`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer YOUR_API_TOKEN`
- **Content-Type:** `application/json`

## Railway Environment Variables

Set these in your Railway project dashboard:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection (auto-set by Railway) | Yes |
| `USDA_API_KEY` | USDA FoodData Central API key | Yes (for food search) |
| `COACH_API_KEY` | AI coach LLM API key (e.g., xAI Grok key) | No |
| `COACH_BASE_URL` | AI coach base URL (e.g., `https://api.x.ai/v1`) | No (defaults to OpenAI) |
| `COACH_MODEL` | AI coach model name (e.g., `grok-beta`) | No (defaults to `gpt-4o`) |
| `OPENAI_API_KEY` | Fallback if COACH_API_KEY not set | No |
| `NODE_ENV` | Set to `production` | Yes |

### AI Coach Configuration Examples

**For xAI Grok:**
```
COACH_API_KEY=xai-...
COACH_BASE_URL=https://api.x.ai/v1
COACH_MODEL=grok-beta
```

**For OpenAI:**
```
OPENAI_API_KEY=sk-...
# COACH_BASE_URL and COACH_MODEL can be omitted for defaults
```

**For other OpenAI-compatible providers:**
```
COACH_API_KEY=your-api-key
COACH_BASE_URL=https://your-provider.com/v1
COACH_MODEL=your-model-name
```

## Security Notes

1. **Never commit API tokens** - Generate them server-side only
2. **Tokens are per-profile** - Each user has their own token
3. **Token hashes only** - Only bcrypt hashes are stored in the database
4. **HTTPS required** - Always use HTTPS in production
5. **Degrade gracefully** - The server works without USDA API key (custom foods only)

## Example Usage

Here's how an AI assistant might log a meal:

**User says:** "I just had 6oz of grilled chicken breast and a cup of brown rice for lunch"

**AI sends (initialize):**
```json
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}},"id":1}
```

**AI sends (tools/call):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "log_food",
    "arguments": {
      "food_name": "grilled chicken breast",
      "quantity": 6,
      "unit": "oz",
      "meal": "lunch"
    }
  },
  "id": 2
}
```

**AI sends (second food):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "log_food",
    "arguments": {
      "food_name": "brown rice cooked",
      "quantity": 1,
      "unit": "cup",
      "meal": "lunch"
    }
  },
  "id": 3
}
```

**AI responds:** "Logged! Your lunch: 6oz grilled chicken breast (219 cal, 46g protein) and 1 cup brown rice (216 cal, 5g protein). Today's total: 1,850 calories, 145g protein."

## Troubleshooting

### "Invalid API token"
- Regenerate the token with `generate-api-token.js`
- Ensure no extra spaces in the Authorization header
- Check that the profile exists in the database

### "USDA search failed"
- Check that USDA_API_KEY is set in Railway
- The server will still work with custom foods only

### "Method not found"
- Use the correct method names: `initialize`, `tools/list`, `tools/call`
- Ensure jsonrpc version is "2.0"

### "AI Coach not configured"
- Set `COACH_API_KEY` (or `OPENAI_API_KEY` as fallback)
- Optionally set `COACH_BASE_URL` for non-OpenAI providers
- Optionally set `COACH_MODEL` to override the default model
