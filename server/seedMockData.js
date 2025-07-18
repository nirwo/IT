const mongoose = require('mongoose');
const VDI = require('./models/VDI');
const UtilizationMetrics = require('./models/UtilizationMetrics');
const UserActivity = require('./models/UserActivity');
const Organization = require('./models/Organization');
require('dotenv').config();

const generateMockData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get the default organization
    const organization = await Organization.findOne({ name: 'Default Organization' });
    if (!organization) {
      console.error('Default organization not found. Please run seed.js first.');
      process.exit(1);
    }

    // Clear existing VDI data
    await VDI.deleteMany({});
    await UtilizationMetrics.deleteMany({});
    await UserActivity.deleteMany({});

    // Mock VDI data
    const mockVDIs = [
      {
        ciName: 'DEV-WIN-001',
        vmId: 'vm-001',
        organization: organization._id,
        assignedUser: {
          username: 'john.doe',
          email: 'john.doe@company.com',
          manager: 'Jane Smith',
          productGroup: 'Frontend Team',
          groupType: 'SW'
        },
        operatingSystem: {
          type: 'Windows',
          version: '11 Pro',
          buildNumber: '22000.1'
        },
        resourceAllocation: {
          cpu: { cores: 4, reservedMhz: 2000 },
          memory: { allocated: 8192, reservation: 4096 },
          storage: { allocated: 120, provisioned: 85 }
        },
        esxiHost: 'esxi-host-01.company.com',
        status: 'active',
        lastSeen: new Date(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        lastBootTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        ciName: 'QA-LINUX-002',
        vmId: 'vm-002',
        organization: organization._id,
        assignedUser: {
          username: 'sarah.wilson',
          email: 'sarah.wilson@company.com',
          manager: 'Mike Johnson',
          productGroup: 'QA Team',
          groupType: 'QA'
        },
        operatingSystem: {
          type: 'Linux',
          version: 'Ubuntu 22.04',
          buildNumber: '22.04.1'
        },
        resourceAllocation: {
          cpu: { cores: 2, reservedMhz: 1500 },
          memory: { allocated: 4096, reservation: 2048 },
          storage: { allocated: 80, provisioned: 45 }
        },
        esxiHost: 'esxi-host-02.company.com',
        status: 'active',
        lastSeen: new Date(),
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        lastBootTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        ciName: 'DEVOPS-WIN-003',
        vmId: 'vm-003',
        organization: organization._id,
        assignedUser: {
          username: 'alex.chen',
          email: 'alex.chen@company.com',
          manager: 'David Brown',
          productGroup: 'DevOps Team',
          groupType: 'dev-ops'
        },
        operatingSystem: {
          type: 'Windows',
          version: '10 Pro',
          buildNumber: '19042.1'
        },
        resourceAllocation: {
          cpu: { cores: 8, reservedMhz: 3000 },
          memory: { allocated: 16384, reservation: 8192 },
          storage: { allocated: 200, provisioned: 150 }
        },
        esxiHost: 'esxi-host-01.company.com',
        status: 'active',
        lastSeen: new Date(),
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        lastBootTime: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        ciName: 'UX-MAC-004',
        vmId: 'vm-004',
        organization: organization._id,
        assignedUser: {
          username: 'emma.davis',
          email: 'emma.davis@company.com',
          manager: 'Lisa White',
          productGroup: 'UX Team',
          groupType: 'UX'
        },
        operatingSystem: {
          type: 'macOS',
          version: '13.0',
          buildNumber: '22A380'
        },
        resourceAllocation: {
          cpu: { cores: 6, reservedMhz: 2500 },
          memory: { allocated: 12288, reservation: 6144 },
          storage: { allocated: 150, provisioned: 90 }
        },
        esxiHost: 'esxi-host-03.company.com',
        status: 'inactive',
        lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        lastBootTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      },
      {
        ciName: 'APP-LINUX-005',
        vmId: 'vm-005',
        organization: organization._id,
        assignedUser: {
          username: 'robert.taylor',
          email: 'robert.taylor@company.com',
          manager: 'Carol Green',
          productGroup: 'Application Team',
          groupType: 'application'
        },
        operatingSystem: {
          type: 'Linux',
          version: 'CentOS 8',
          buildNumber: '8.4.2105'
        },
        resourceAllocation: {
          cpu: { cores: 4, reservedMhz: 2200 },
          memory: { allocated: 8192, reservation: 4096 },
          storage: { allocated: 100, provisioned: 65 }
        },
        esxiHost: 'esxi-host-02.company.com',
        status: 'maintenance',
        lastSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        lastBootTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    ];

    // Insert VDIs
    const createdVDIs = await VDI.insertMany(mockVDIs);
    console.log(`Created ${createdVDIs.length} VDIs`);

    // Generate utilization metrics for the last 30 days
    const metricsData = [];
    const activityData = [];

    for (const vdi of createdVDIs) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        
        // Generate realistic utilization data
        const cpuUtil = Math.random() * 100;
        const memoryUtil = Math.random() * 100;
        const diskUtil = Math.random() * 100;
        
        metricsData.push({
          vdiId: vdi._id,
          timestamp: date,
          metrics: {
            cpu: {
              usage: cpuUtil,
              cores: vdi.resourceAllocation.cpu.cores,
              mhz: vdi.resourceAllocation.cpu.reservedMhz * (cpuUtil / 100)
            },
            memory: {
              usage: memoryUtil,
              used: vdi.resourceAllocation.memory.allocated * (memoryUtil / 100),
              total: vdi.resourceAllocation.memory.allocated
            },
            storage: {
              usage: diskUtil,
              used: vdi.resourceAllocation.storage.provisioned,
              total: vdi.resourceAllocation.storage.allocated
            }
          },
          network: {
            bytesIn: Math.random() * 1000000,
            bytesOut: Math.random() * 500000
          },
          collectionSource: 'Manual'
        });

        // Generate user activity data
        if (Math.random() > 0.3) { // 70% chance of activity
          const loginTime = new Date(date.getTime() + Math.random() * 8 * 60 * 60 * 1000); // Random time during work hours
          const sessionDuration = Math.random() * 480; // 0-8 hours in minutes
          
          const sessionId = `session-${vdi._id}-${date.getTime()}`;
          
          // Login event
          activityData.push({
            vdiId: vdi._id,
            username: vdi.assignedUser.username,
            eventType: 'login',
            timestamp: loginTime,
            sessionId: sessionId,
            sessionDuration: sessionDuration,
            clientInfo: {
              ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
              clientType: 'desktop'
            },
            source: 'Manual'
          });
          
          // Logout event
          activityData.push({
            vdiId: vdi._id,
            username: vdi.assignedUser.username,
            eventType: 'logout',
            timestamp: new Date(loginTime.getTime() + sessionDuration * 60 * 1000),
            sessionId: sessionId,
            sessionDuration: sessionDuration,
            clientInfo: {
              ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
              clientType: 'desktop'
            },
            source: 'Manual'
          });
        }
      }
    }

    // Insert metrics and activities
    await UtilizationMetrics.insertMany(metricsData);
    console.log(`Created ${metricsData.length} utilization metrics`);

    await UserActivity.insertMany(activityData);
    console.log(`Created ${activityData.length} user activities`);

    console.log('Mock data generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating mock data:', error);
    process.exit(1);
  }
};

generateMockData();
