const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const vdiRoutes = require('../server/routes/vdi');
const VDI = require('../server/models/VDI');
const User = require('../server/models/User');
const Organization = require('../server/models/Organization');
const { authenticate } = require('../server/middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/vdi', vdiRoutes);

describe('VDI Routes', () => {
  let testUser;
  let testOrg;
  let authToken;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Organization',
      type: 'user'
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      organization: testOrg._id,
      permissions: ['read', 'write']
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  describe('GET /api/vdi', () => {
    beforeEach(async () => {
      await VDI.create([
        {
          ciName: 'test-vdi-1',
          vmId: 'vm-001',
          organization: testOrg._id,
          assignedUser: {
            username: 'user1',
            productGroup: 'Development'
          },
          operatingSystem: {
            type: 'Windows',
            version: '10'
          },
          resourceAllocation: {
            cpu: { cores: 4 },
            memory: { allocated: 8192 },
            storage: { allocated: 102400 }
          },
          esxiHost: 'esxi-host-1',
          status: 'active'
        },
        {
          ciName: 'test-vdi-2',
          vmId: 'vm-002',
          organization: testOrg._id,
          assignedUser: {
            username: 'user2',
            productGroup: 'QA'
          },
          operatingSystem: {
            type: 'Linux',
            version: 'Ubuntu 20.04'
          },
          resourceAllocation: {
            cpu: { cores: 2 },
            memory: { allocated: 4096 },
            storage: { allocated: 51200 }
          },
          esxiHost: 'esxi-host-2',
          status: 'inactive'
        }
      ]);
    });

    it('should return paginated VDI list', async () => {
      const response = await request(app)
        .get('/api/vdi')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vdis).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter VDIs by status', async () => {
      const response = await request(app)
        .get('/api/vdi?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vdis).toHaveLength(1);
      expect(response.body.vdis[0].status).toBe('active');
    });

    it('should filter VDIs by OS type', async () => {
      const response = await request(app)
        .get('/api/vdi?osType=Windows')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vdis).toHaveLength(1);
      expect(response.body.vdis[0].operatingSystem.type).toBe('Windows');
    });

    it('should search VDIs by name', async () => {
      const response = await request(app)
        .get('/api/vdi?search=test-vdi-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vdis).toHaveLength(1);
      expect(response.body.vdis[0].ciName).toBe('test-vdi-1');
    });

    it('should sort VDIs by name', async () => {
      const response = await request(app)
        .get('/api/vdi?sortBy=ciName&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vdis[0].ciName).toBe('test-vdi-2');
      expect(response.body.vdis[1].ciName).toBe('test-vdi-1');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/vdi')
        .expect(401);
    });
  });

  describe('GET /api/vdi/:id', () => {
    let testVDI;

    beforeEach(async () => {
      testVDI = await VDI.create({
        ciName: 'test-vdi',
        vmId: 'vm-001',
        organization: testOrg._id,
        assignedUser: {
          username: 'user1',
          productGroup: 'Development'
        },
        operatingSystem: {
          type: 'Windows',
          version: '10'
        },
        resourceAllocation: {
          cpu: { cores: 4 },
          memory: { allocated: 8192 },
          storage: { allocated: 102400 }
        },
        esxiHost: 'esxi-host-1',
        status: 'active'
      });
    });

    it('should return VDI details', async () => {
      const response = await request(app)
        .get(`/api/vdi/${testVDI._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vdi.ciName).toBe('test-vdi');
      expect(response.body.vdi.vmId).toBe('vm-001');
      expect(response.body).toHaveProperty('recentMetrics');
      expect(response.body).toHaveProperty('recentActivity');
    });

    it('should return 404 for non-existent VDI', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/vdi/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get(`/api/vdi/${testVDI._id}`)
        .expect(401);
    });
  });

  describe('GET /api/vdi/summary', () => {
    beforeEach(async () => {
      await VDI.create([
        {
          ciName: 'active-vdi-1',
          vmId: 'vm-001',
          organization: testOrg._id,
          assignedUser: { username: 'user1' },
          operatingSystem: { type: 'Windows', version: '10' },
          resourceAllocation: {
            cpu: { cores: 4 },
            memory: { allocated: 8192 },
            storage: { allocated: 102400 }
          },
          esxiHost: 'esxi-host-1',
          status: 'active'
        },
        {
          ciName: 'inactive-vdi-1',
          vmId: 'vm-002',
          organization: testOrg._id,
          assignedUser: { username: 'user2' },
          operatingSystem: { type: 'Linux', version: 'Ubuntu 20.04' },
          resourceAllocation: {
            cpu: { cores: 2 },
            memory: { allocated: 4096 },
            storage: { allocated: 51200 }
          },
          esxiHost: 'esxi-host-2',
          status: 'inactive'
        }
      ]);
    });

    it('should return utilization summary', async () => {
      const response = await request(app)
        .get('/api/vdi/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.totalVDIs).toBe(2);
      expect(response.body.activeVDIs).toBe(1);
      expect(response.body.inactiveVDIs).toBe(1);
      expect(response.body.resourceAllocation).toHaveProperty('totalCPU');
      expect(response.body.resourceAllocation).toHaveProperty('totalMemory');
      expect(response.body.resourceAllocation).toHaveProperty('totalStorage');
    });

    it('should calculate resource totals correctly', async () => {
      const response = await request(app)
        .get('/api/vdi/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.resourceAllocation.totalCPU).toBe(6);
      expect(response.body.resourceAllocation.totalMemory).toBe(12288);
      expect(response.body.resourceAllocation.totalStorage).toBe(153600);
    });
  });

  describe('PUT /api/vdi/:id', () => {
    let testVDI;

    beforeEach(async () => {
      testVDI = await VDI.create({
        ciName: 'test-vdi',
        vmId: 'vm-001',
        organization: testOrg._id,
        assignedUser: {
          username: 'user1',
          productGroup: 'Development'
        },
        operatingSystem: {
          type: 'Windows',
          version: '10'
        },
        resourceAllocation: {
          cpu: { cores: 4 },
          memory: { allocated: 8192 },
          storage: { allocated: 102400 }
        },
        esxiHost: 'esxi-host-1',
        status: 'active'
      });
    });

    it('should update VDI successfully', async () => {
      const updateData = {
        assignedUser: {
          username: 'newuser',
          email: 'newuser@example.com',
          productGroup: 'QA'
        },
        status: 'maintenance'
      };

      const response = await request(app)
        .put(`/api/vdi/${testVDI._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.assignedUser.username).toBe('newuser');
      expect(response.body.assignedUser.email).toBe('newuser@example.com');
      expect(response.body.assignedUser.productGroup).toBe('QA');
      expect(response.body.status).toBe('maintenance');
    });

    it('should reject invalid status', async () => {
      const updateData = {
        status: 'invalid-status'
      };

      await request(app)
        .put(`/api/vdi/${testVDI._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should reject request without write permission', async () => {
      const readOnlyUser = await User.create({
        username: 'readonly',
        email: 'readonly@example.com',
        password: 'password123',
        organization: testOrg._id,
        permissions: ['read']
      });

      const readOnlyLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'readonly',
          password: 'password123'
        });

      const readOnlyToken = readOnlyLoginResponse.body.token;

      await request(app)
        .put(`/api/vdi/${testVDI._id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ status: 'maintenance' })
        .expect(403);
    });
  });
});