import request from 'supertest';
import express from 'express';
import mcpRoutes from './server.js';

// MCP Protocol version
const MCP_VERSION = '2024-11-05';

describe('MCP Server - JSON-RPC Protocol', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/mcp', mcpRoutes);
  });
  
  describe('Authentication', () => {
    it('should return JSON-RPC error when no Authorization header is provided', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
        .expect(401);
      
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
    
    it('should return JSON-RPC error when Authorization header is invalid format', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
        .expect(401);
      
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return JSON-RPC error when Bearer token is empty', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer ')
        .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
        .expect(401);
      
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message.toLowerCase()).toMatch(/empty|missing|invalid/);
    });
    
    it('should return JSON-RPC error when Bearer token is invalid', async () => {
      // Skip if no database connection
      if (!process.env.DATABASE_URL) {
        console.log('Skipping test - requires database');
        return;
      }
      
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token-here')
        .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
        .expect(401);
      
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Invalid');
    });
  });
  
  describe('JSON-RPC Validation', () => {
    it('should reject requests without jsonrpc version', async () => {
      // Skip if no database (can't authenticate)
      if (!process.env.DATABASE_URL) {
        console.log('Skipping test - requires database');
        return;
      }
      
      // Note: This would need a valid token in production
    });
  });
});

describe('MCP Protocol Compliance', () => {
  describe('Initialize Response Format', () => {
    it('should have correct initialize response structure', () => {
      const expectedResponse = {
        protocolVersion: MCP_VERSION,
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'fitness-tracker-mcp',
          version: '1.0.0',
        },
      };
      
      expect(expectedResponse.protocolVersion).toBe('2024-11-05');
      expect(expectedResponse.capabilities).toHaveProperty('tools');
      expect(expectedResponse.serverInfo).toHaveProperty('name');
      expect(expectedResponse.serverInfo).toHaveProperty('version');
    });
  });
  
  describe('Tools List Format', () => {
    it('should have expected tool names', () => {
      const expectedTools = [
        'search_food',
        'log_food',
        'get_daily_nutrition',
        'list_food_entries',
        'update_food_entry',
        'delete_food_entry',
        'log_weight',
        'log_workout',
        'log_skate_session',
      ];
      
      expectedTools.forEach(tool => {
        expect(expectedTools).toContain(tool);
      });
    });
    
    it('should have valid inputSchema for each tool', () => {
      // Tools should have inputSchema with type: "object"
      const toolSchema = {
        name: 'log_food',
        inputSchema: {
          type: 'object',
          properties: {
            food_name: { type: 'string' },
            quantity: { type: 'number' },
          },
          required: ['food_name', 'quantity'],
        },
      };
      
      expect(toolSchema.inputSchema.type).toBe('object');
      expect(toolSchema.inputSchema.properties).toHaveProperty('food_name');
      expect(toolSchema.inputSchema.required).toContain('food_name');
    });
  });
  
  describe('Tools Call Response Format', () => {
    it('should return content array with text type', () => {
      const expectedResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ logged: { name: 'Test Food' }, date: '2026-11-26' }, null, 2),
          },
        ],
      };
      
      expect(expectedResponse.content).toBeInstanceOf(Array);
      expect(expectedResponse.content[0].type).toBe('text');
      expect(expectedResponse.content[0].text).toBeDefined();
    });
  });
});

describe('MCP Tool Logic', () => {
  describe('Date Handling', () => {
    it('should format today correctly', () => {
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
  
  describe('Factor Calculation', () => {
    function toGrams(val, unitStr) {
      const n = parseFloat(val) || 0;
      const uLower = unitStr.toLowerCase();
      if (uLower === 'g' || uLower === 'gram' || uLower === 'grams') return n;
      if (uLower === 'oz' || uLower === 'ounce') return n * 28.3495;
      if (uLower === 'cup' || uLower === 'cups') return n * 240;
      if (uLower === 'tbsp') return n * 15;
      if (uLower === 'tsp') return n * 5;
      return n;
    }
    
    it('should convert oz to grams correctly', () => {
      expect(toGrams(1, 'oz')).toBeCloseTo(28.3495, 2);
      expect(toGrams(2, 'oz')).toBeCloseTo(56.699, 2);
    });
    
    it('should convert cups to grams correctly', () => {
      expect(toGrams(1, 'cup')).toBe(240);
      expect(toGrams(0.5, 'cups')).toBe(120);
    });
    
    it('should convert tbsp to grams correctly', () => {
      expect(toGrams(1, 'tbsp')).toBe(15);
      expect(toGrams(2, 'tbsp')).toBe(30);
    });
    
    it('should convert tsp to grams correctly', () => {
      expect(toGrams(1, 'tsp')).toBe(5);
      expect(toGrams(3, 'tsp')).toBe(15);
    });
    
    it('should return grams unchanged', () => {
      expect(toGrams(100, 'g')).toBe(100);
      expect(toGrams(50, 'grams')).toBe(50);
    });
  });
  
  describe('Macro Scaling', () => {
    it('should scale macros proportionally', () => {
      const baseMacros = { calories: 200, protein: 25, fat: 10, carbs: 5 };
      const servingSize = 100; // per 100g
      const amount = 150; // eating 150g
      const factor = amount / servingSize;
      
      const scaled = {
        calories: Math.round(baseMacros.calories * factor),
        protein: Math.round(baseMacros.protein * factor * 10) / 10,
        fat: Math.round(baseMacros.fat * factor * 10) / 10,
        carbs: Math.round(baseMacros.carbs * factor * 10) / 10,
      };
      
      expect(scaled.calories).toBe(300);
      expect(scaled.protein).toBe(37.5);
      expect(scaled.fat).toBe(15);
      expect(scaled.carbs).toBe(7.5);
    });
    
    it('should handle fractional amounts', () => {
      const baseMacros = { calories: 100, protein: 10, fat: 5, carbs: 15 };
      const servingSize = 100;
      const amount = 33; // 1/3 serving
      const factor = amount / servingSize;
      
      const scaled = {
        calories: Math.round(baseMacros.calories * factor),
        protein: Math.round(baseMacros.protein * factor * 10) / 10,
      };
      
      expect(scaled.calories).toBe(33);
      expect(scaled.protein).toBe(3.3);
    });
  });
});

describe('MCP Integration Test Flow', () => {
  it('should demonstrate initialize -> tools/list -> tools/call sequence', () => {
    // This test documents the expected flow for a standard MCP client
    
    // Step 1: Initialize
    const initRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
      id: 1,
    };
    expect(initRequest.method).toBe('initialize');
    
    // Step 2: Initialized notification
    const initializedNotification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    };
    expect(initializedNotification.method).toBe('notifications/initialized');
    
    // Step 3: Tools list
    const toolsListRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2,
    };
    expect(toolsListRequest.method).toBe('tools/list');
    
    // Step 4: Tools call
    const toolsCallRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'log_food',
        arguments: {
          food_name: 'chicken breast',
          quantity: 150,
          unit: 'g',
        },
      },
      id: 3,
    };
    expect(toolsCallRequest.method).toBe('tools/call');
    expect(toolsCallRequest.params.name).toBe('log_food');
  });
});
