# MCP Server Documentation

This fitness app includes an MCP (Model Context Protocol) server that allows AI assistants to log food, workouts, and body metrics via natural language.

## Overview

The MCP server provides HTTP endpoints that an AI assistant can call to:
- Search for foods (USDA database + custom foods)
- Log food entries with automatic macro calculation
- Get daily nutrition summaries
- List, update, and delete food entries
- Log weight and waist measurements
- Log workouts with exercises and sets
- Log skateboard training sessions

## Authentication

The MCP server uses per-profile API tokens for authentication.

### Generating an API Token

1. SSH into your Railway deployment or run locally:
   ```bash
   cd backend
   node src/scripts/generate-api-token.js <profile_id>
   # or
   node src/scripts/generate-api-token.js --email brian@example.com
   ```

2. Save the generated token securely - it will only be shown once.

### Using the Token

Add the token to your MCP client configuration as a Bearer token:

```
Authorization: Bearer <your-token>
```

## API Endpoints

Base URL: `https://your-railway-domain/api/mcp`

### GET /api/mcp/tools

Lists all available MCP tools with their parameters.

**Response:**
```json
{
  "version": "1.0",
  "tools": [
    {
      "name": "search_food",
      "description": "Search for foods by name or barcode",
      "parameters": { ... }
    },
    // ... more tools
  ]
}
```

### POST /api/mcp/call

Execute an MCP tool.

**Request Body:**
```json
{
  "tool": "log_food",
  "parameters": {
    "food_name": "chicken breast",
    "quantity": 150,
    "unit": "g"
  }
}
```

**Response:**
```json
{
  "result": {
    "logged": { ... },
    "date": "2026-11-26",
    "total_entries": 5
  }
}
```

## Available Tools

### search_food
Search for foods by name or barcode.

**Parameters:**
- `query` (string, optional): Food name to search for
- `barcode` (string, optional): Barcode (GTIN/UPC) to search for

**Example:**
```json
{
  "tool": "search_food",
  "parameters": {
    "query": "chicken breast"
  }
}
```

### log_food
Log a food entry for a specific date.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (defaults to today)
- `food_name` (string, required): Name or description of the food
- `quantity` (number, required): Amount of food
- `unit` (string, optional): Unit (g, oz, serving, cup, etc.) - defaults to "g"
- `meal` (string, optional): Meal type (breakfast, lunch, dinner, snack)
- `calories` (number, optional): Override calories
- `protein` (number, optional): Override protein in grams
- `fat` (number, optional): Override fat in grams
- `carbs` (number, optional): Override carbs in grams

**Example:**
```json
{
  "tool": "log_food",
  "parameters": {
    "food_name": "grilled chicken breast",
    "quantity": 6,
    "unit": "oz",
    "meal": "lunch"
  }
}
```

### get_daily_nutrition
Get nutrition summary for a specific date.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (defaults to today)

**Example Response:**
```json
{
  "result": {
    "date": "2026-11-26",
    "entries": 5,
    "totals": {
      "calories": 1850,
      "protein": 145.5,
      "fat": 65.2,
      "carbs": 180.3
    }
  }
}
```

### list_food_entries
List all food entries for a specific date.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (defaults to today)

### update_food_entry
Update a specific food entry.

**Parameters:**
- `date` (string, required): Date in YYYY-MM-DD format
- `entry_index` (number, required): Index of the food entry to update (0-based)
- `quantity` (number, optional): New amount
- `unit` (string, optional): New unit

### delete_food_entry
Delete a specific food entry.

**Parameters:**
- `date` (string, required): Date in YYYY-MM-DD format
- `entry_index` (number, required): Index of the food entry to delete (0-based)

### log_weight
Log weight and optional waist measurement.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (defaults to today)
- `weight` (number, required): Weight in pounds
- `waist` (number, optional): Waist measurement in inches

**Example:**
```json
{
  "tool": "log_weight",
  "parameters": {
    "weight": 185.5,
    "waist": 34.0
  }
}
```

### log_workout
Log a workout with exercises.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (defaults to today)
- `exercises` (array, required): Array of exercises

**Exercise structure:**
```json
{
  "name": "Bench Press",
  "muscle_group": "Chest",
  "sets": [
    { "weight": 135, "reps": 10 },
    { "weight": 155, "reps": 8 },
    { "weight": 175, "reps": 6 }
  ]
}
```

**Muscle groups:** Biceps, Triceps, Chest, Back, Shoulders, Legs, Core, Forearms

### log_skate_session
Log a skateboard training session.

**Parameters:**
- `date` (string, optional): Date in YYYY-MM-DD format (defaults to today)
- `session_type` (string, required): Type of session
- `distance_miles` (number, optional): Distance in miles
- `duration_minutes` (number, optional): Duration in minutes
- `switch_foot_minutes` (number, optional): Minutes on switch foot
- `weak_side_comfort` (number, optional): Comfort level 1-10
- `notes` (string, optional): Session notes

**Session types:** ldp, scogging, freestyle, long_session, switch_practice

## Connecting as Remote MCP Server

### For Claude Desktop / AI Assistants

Add this configuration to your MCP client:

```json
{
  "mcpServers": {
    "fitness-tracker": {
      "transport": "http",
      "url": "https://your-railway-domain.up.railway.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}
```

### Environment Variables for Railway

Set these in your Railway project:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes (auto-set by Railway) |
| `USDA_API_KEY` | USDA FoodData Central API key | Yes (for food search) |
| `NODE_ENV` | Set to `production` | Yes |

### Security Notes

1. **Never commit API tokens** - Generate them server-side only
2. **Tokens are per-profile** - Each user has their own token
3. **Token hashes only** - Only bcrypt hashes are stored in the database
4. **HTTPS required** - Always use HTTPS in production
5. **Degrade gracefully** - The server works without USDA API key (custom foods only)

## Example Usage

Here's how an AI assistant might log a meal:

**User says:** "I just had 6oz of grilled chicken breast and a cup of brown rice for lunch"

**AI calls:**
```json
{
  "tool": "log_food",
  "parameters": {
    "food_name": "grilled chicken breast",
    "quantity": 6,
    "unit": "oz",
    "meal": "lunch"
  }
}
```

Then:
```json
{
  "tool": "log_food",
  "parameters": {
    "food_name": "brown rice cooked",
    "quantity": 1,
    "unit": "cup",
    "meal": "lunch"
  }
}
```

**AI responds:** "Logged! Your lunch: 6oz grilled chicken breast (219 cal, 46g protein) and 1 cup brown rice (216 cal, 5g protein). Today's total: 1,850 calories, 145g protein."

## Troubleshooting

### "Invalid API token"
- Regenerate the token with `generate-api-token.js`
- Ensure no extra spaces in the Authorization header

### "USDA search failed"
- Check that USDA_API_KEY is set in Railway
- The server will still work with custom foods only

### "Profile ID required"
- Ensure the token is for a valid profile
- The token automatically scopes all operations to that profile
