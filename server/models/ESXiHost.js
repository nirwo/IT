const mongoose = require('mongoose');

const esxiHostSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  hostname: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
    required: true
  },
  vCenterId: {
    type: String,
    required: true,
    unique: true
  },
  hardware: {
    vendor: String,
    model: String,
    serialNumber: String,
    processorType: String,
    biosVersion: String,
    cpuModel: String
  },
  capacity: {
    cpu: {
      cores: {
        type: Number,
        required: true
      },
      threads: {
        type: Number,
        required: true
      },
      mhz: {
        type: Number,
        required: true
      },
      sockets: {
        type: Number,
        required: true
      }
    },
    memory: {
      mb: {
        type: Number,
        required: true
      }
    },
    storage: {
      datastores: [{
        name: String,
        type: String,
        capacity: Number,
        freeSpace: Number,
        accessible: Boolean
      }]
    }
  },
  utilization: {
    cpu: {
      usage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      ready: {
        type: Number,
        default: 0
      }
    },
    memory: {
      usage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      consumed: {
        type: Number,
        default: 0
      },
      active: {
        type: Number,
        default: 0
      }
    },
    storage: {
      usage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    network: {
      usage: {
        type: Number,
        default: 0
      },
      packetsRx: {
        type: Number,
        default: 0
      },
      packetsTx: {
        type: Number,
        default: 0
      }
    }
  },
  vmCount: {
    total: {
      type: Number,
      default: 0
    },
    poweredOn: {
      type: Number,
      default: 0
    }
  },
  connectionState: {
    type: String,
    enum: ['connected', 'disconnected', 'notResponding', 'maintenance'],
    default: 'connected'
  },
  powerState: {
    type: String,
    enum: ['poweredOn', 'poweredOff', 'standBy'],
    default: 'poweredOn'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  version: {
    name: String,
    version: String,
    build: String,
    fullName: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },
  lastSync: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

esxiHostSchema.index({ organization: 1, cluster: 1 });
esxiHostSchema.index({ vCenterId: 1 }, { unique: true });
esxiHostSchema.index({ hostname: 1 });
esxiHostSchema.index({ connectionState: 1, powerState: 1 });

esxiHostSchema.methods.calculateAvailableResources = function() {
  const cpuAvailable = Math.floor(this.capacity.cpu.cores * 0.85) - Math.floor(this.capacity.cpu.cores * (this.utilization.cpu.usage / 100));
  const memoryAvailable = Math.floor(this.capacity.memory.mb * 0.85) - Math.floor(this.capacity.memory.mb * (this.utilization.memory.usage / 100));
  
  return {
    cpu: {
      cores: Math.max(0, cpuAvailable),
      mhz: Math.floor(this.capacity.cpu.mhz * 0.85) - Math.floor(this.capacity.cpu.mhz * (this.utilization.cpu.usage / 100))
    },
    memory: {
      mb: Math.max(0, memoryAvailable)
    }
  };
};

esxiHostSchema.methods.isHealthy = function() {
  return this.connectionState === 'connected' && 
         this.powerState === 'poweredOn' && 
         !this.maintenanceMode &&
         this.utilization.cpu.usage < 90 &&
         this.utilization.memory.usage < 90;
};

esxiHostSchema.methods.getResourceEfficiency = function() {
  const cpuEfficiency = this.vmCount.poweredOn > 0 ? (this.utilization.cpu.usage / this.vmCount.poweredOn) : 0;
  const memoryEfficiency = this.vmCount.poweredOn > 0 ? (this.utilization.memory.usage / this.vmCount.poweredOn) : 0;
  
  return {
    cpu: cpuEfficiency,
    memory: memoryEfficiency,
    overall: (cpuEfficiency + memoryEfficiency) / 2
  };
};

module.exports = mongoose.model('ESXiHost', esxiHostSchema);