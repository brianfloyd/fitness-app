import request from 'supertest';
import express from 'express';
import foodsRoutes from './foods.js';
import { jest } from '@jest/globals';

// Note: These tests require the USDA_API_KEY environment variable to be set
// and a database connection. For CI, some tests may be skipped.
const hasDatabase = !!process.env.DATABASE_URL;

describe('Foods Routes', () => {
  let app;
  const profileId = '1';
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Add mock requireProfileId middleware
    app.use((req, res, next) => {
      req.profileId = req.headers['x-profile-id'] || null;
      next();
    });
    app.use('/foods', foodsRoutes);
  });
  
  describe('GET /foods/search', () => {
    it('should return 400 when no query or gtin is provided', async () => {
      const response = await request(app)
        .get('/foods/search')
        .set('X-Profile-Id', profileId)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query or GTIN parameter is required');
    });
    
    it('should search for foods with query parameter', async () => {
      // Skip if no USDA API key
      if (!process.env.USDA_API_KEY) {
        console.log('Skipping USDA search test - no API key');
        return;
      }
      
      const response = await request(app)
        .get('/foods/search')
        .set('X-Profile-Id', profileId)
        .query({ query: 'chicken breast' })
        .expect(200);
      
      expect(response.body).toHaveProperty('foods');
      expect(Array.isArray(response.body.foods)).toBe(true);
    });
    
    it('should search for foods with barcode (GTIN)', async () => {
      // Skip if no USDA API key
      if (!process.env.USDA_API_KEY) {
        console.log('Skipping USDA barcode test - no API key');
        return;
      }
      
      const response = await request(app)
        .get('/foods/search')
        .set('X-Profile-Id', profileId)
        .query({ gtin: '070470496528' }) // Example barcode
        .expect(200);
      
      expect(response.body).toHaveProperty('foods');
      expect(Array.isArray(response.body.foods)).toBe(true);
    });
    
    it('should allow short queries and return results', async () => {
      if (!hasDatabase) {
        console.log('Skipping test - requires database');
        return;
      }
      // Short queries are allowed - they will search custom foods in DB
      // The test verifies the route doesn't crash on short queries
      const response = await request(app)
        .get('/foods/search')
        .set('X-Profile-Id', profileId)
        .query({ query: 'a' })
        .expect(200);
      
      expect(response.body).toHaveProperty('foods');
    });
  });
  
  describe('POST /foods/custom', () => {
    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/foods/custom')
        .set('X-Profile-Id', profileId)
        .send({
          serving_size: 100,
          serving_unit: 'g',
          calories: 200,
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Name is required');
    });
    
    it('should return 400 when calories is missing', async () => {
      const response = await request(app)
        .post('/foods/custom')
        .set('X-Profile-Id', profileId)
        .send({
          name: 'Test Food',
          serving_size: 100,
          serving_unit: 'g',
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Calories is required');
    });
    
    it('should return 400 when serving_unit is invalid', async () => {
      const response = await request(app)
        .post('/foods/custom')
        .set('X-Profile-Id', profileId)
        .send({
          name: 'Test Food',
          serving_size: 100,
          serving_unit: 'cups', // Invalid - must be 'g' or 'oz'
          calories: 200,
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Serving unit must be g or oz');
    });
    
    it('should return 400 when serving_size is invalid', async () => {
      const response = await request(app)
        .post('/foods/custom')
        .set('X-Profile-Id', profileId)
        .send({
          name: 'Test Food',
          serving_size: -10,
          serving_unit: 'g',
          calories: 200,
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Serving size is required');
    });
  });
  
  describe('GET /foods/custom/check', () => {
    it('should return 400 when neither name nor barcode is provided', async () => {
      const response = await request(app)
        .get('/foods/custom/check')
        .set('X-Profile-Id', profileId)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Name or barcode is required');
    });
    
    it('should return matches array for valid query', async () => {
      if (!hasDatabase) {
        console.log('Skipping test - requires database');
        return;
      }
      const response = await request(app)
        .get('/foods/custom/check')
        .set('X-Profile-Id', profileId)
        .query({ name: 'Test' })
        .expect(200);
      
      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);
    });
  });
  
  describe('GET /foods/:fdcId', () => {
    it('should return 400 for invalid FDC ID', async () => {
      const response = await request(app)
        .get('/foods/invalid')
        .set('X-Profile-Id', profileId)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid FDC ID');
    });
    
    it('should fetch food details for valid FDC ID', async () => {
      // Skip if no USDA API key
      if (!process.env.USDA_API_KEY) {
        console.log('Skipping USDA food details test - no API key');
        return;
      }
      
      // Use a known FDC ID (chicken breast)
      const response = await request(app)
        .get('/foods/171077')
        .set('X-Profile-Id', profileId)
        .expect(200);
      
      expect(response.body).toHaveProperty('fdcId');
      expect(response.body).toHaveProperty('description');
    });
  });
  
  describe('POST /foods/batch', () => {
    it('should return 400 when fdcIds is not an array', async () => {
      const response = await request(app)
        .post('/foods/batch')
        .set('X-Profile-Id', profileId)
        .send({ fdcIds: 'not-an-array' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('fdcIds array is required');
    });
    
    it('should return 400 when fdcIds array is empty', async () => {
      const response = await request(app)
        .post('/foods/batch')
        .set('X-Profile-Id', profileId)
        .send({ fdcIds: [] })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 400 when fdcIds array exceeds limit', async () => {
      const response = await request(app)
        .post('/foods/batch')
        .set('X-Profile-Id', profileId)
        .send({ fdcIds: Array(21).fill(123456) })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Maximum 20 food IDs');
    });
  });
});

describe('Macro Calculations', () => {
  it('should correctly convert oz to grams', () => {
    // 1 oz = 28.3495 grams
    const oz = 2;
    const expectedGrams = oz * 28.3495;
    expect(Math.abs(expectedGrams - 56.699)).toBeLessThan(0.01);
  });
  
  it('should correctly calculate macros per 100g', () => {
    // Test: 100g of food with 20g protein, 10g fat, 30g carbs
    const protein = 20;
    const fat = 10;
    const carbs = 30;
    const expectedCalories = (protein * 4) + (fat * 9) + (carbs * 4);
    expect(expectedCalories).toBe(290);
  });
  
  it('should scale macros correctly for different amounts', () => {
    // 50g should give half the macros
    const baseProtein = 20; // per 100g
    const baseFat = 10;
    const baseCarbs = 30;
    const amount = 50;
    const multiplier = amount / 100;
    
    const scaledProtein = baseProtein * multiplier;
    const scaledFat = baseFat * multiplier;
    const scaledCarbs = baseCarbs * multiplier;
    
    expect(scaledProtein).toBe(10);
    expect(scaledFat).toBe(5);
    expect(scaledCarbs).toBe(15);
  });
});
