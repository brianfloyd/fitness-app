import request from 'supertest';
import express from 'express';
import coachRoutes from './coach.js';

describe('Coach Routes', () => {
  let app;
  const profileId = '1';
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/coach', coachRoutes);
  });
  
  describe('GET /coach/status', () => {
    it('should return status object with available field', async () => {
      const response = await request(app)
        .get('/coach/status')
        .set('X-Profile-Id', profileId)
        .expect(200);
      
      expect(response.body).toHaveProperty('available');
      expect(typeof response.body.available).toBe('boolean');
      
      if (response.body.available) {
        expect(response.body).toHaveProperty('model');
      } else {
        expect(response.body).toHaveProperty('message');
      }
    });
    
    it('should return 401 when profile ID is missing', async () => {
      const response = await request(app)
        .get('/coach/status')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /coach/substitutions', () => {
    it('should return all substitutions when no exercise is specified', async () => {
      const response = await request(app)
        .get('/coach/substitutions')
        .set('X-Profile-Id', profileId)
        .expect(200);
      
      expect(response.body.substitutions).toBeDefined();
      expect(typeof response.body.substitutions).toBe('object');
      expect(Object.keys(response.body.substitutions).length).toBeGreaterThan(0);
    });
    
    it('should return specific substitutions for shoulder press', async () => {
      const response = await request(app)
        .get('/coach/substitutions')
        .set('X-Profile-Id', profileId)
        .query({ exercise: 'shoulder press' })
        .expect(200);
      
      expect(response.body.exercise).toBe('shoulder press');
      expect(response.body.substitutions).toBeDefined();
      expect(Array.isArray(response.body.substitutions)).toBe(true);
      expect(response.body.substitutions.length).toBeGreaterThan(0);
      expect(response.body.substitutions).toContain('landmine press');
    });
    
    it('should return specific substitutions for barbell curl', async () => {
      const response = await request(app)
        .get('/coach/substitutions')
        .set('X-Profile-Id', profileId)
        .query({ exercise: 'barbell curl' })
        .expect(200);
      
      expect(response.body.exercise).toBe('barbell curl');
      expect(response.body.substitutions).toBeDefined();
      expect(Array.isArray(response.body.substitutions)).toBe(true);
      expect(response.body.substitutions.length).toBeGreaterThan(0);
    });
    
    it('should return empty array for unknown exercise', async () => {
      const response = await request(app)
        .get('/coach/substitutions')
        .set('X-Profile-Id', profileId)
        .query({ exercise: 'Unknown Exercise XYZ123' })
        .expect(200);
      
      expect(response.body.exercise).toBe('Unknown Exercise XYZ123');
      expect(response.body.substitutions).toEqual([]);
    });
    
    it('should include shoulder-friendly exercises in substitutions mapping', async () => {
      const response = await request(app)
        .get('/coach/substitutions')
        .set('X-Profile-Id', profileId)
        .expect(200);
      
      const subs = response.body.substitutions;
      
      // Check that common problematic exercises have substitutions
      expect(subs).toHaveProperty('shoulder press');
      expect(subs).toHaveProperty('bench');
      expect(subs).toHaveProperty('barbell curl');
      expect(subs).toHaveProperty('skull crusher');
    });
  });
  
  describe('POST /coach/chat', () => {
    it('should return error when coach is not configured', async () => {
      // Check the status endpoint behavior
      const statusResponse = await request(app)
        .get('/coach/status')
        .set('X-Profile-Id', profileId)
        .expect(200);
      
      if (!statusResponse.body.available) {
        // If coach is not available, chat should fail with 503
        const response = await request(app)
          .post('/coach/chat')
          .set('X-Profile-Id', profileId)
          .send({ message: 'Hello' })
          .expect(503);
        
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('not configured');
      } else {
        // If coach is available, test the validation
        const response = await request(app)
          .post('/coach/chat')
          .set('X-Profile-Id', profileId)
          .send({})
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Message is required');
      }
    });
    
    it('should return 401 when profile ID is missing', async () => {
      const response = await request(app)
        .post('/coach/chat')
        .send({ message: 'Hello' })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
