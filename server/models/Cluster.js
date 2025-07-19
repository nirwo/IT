const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  vCenterId: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    datacenter: String,
    site: String,
    rack: String
  },
  configuration: {
    drsEnabled: {
      type: Boolean,
      default: false
    },
    haEnabled: {
      type: Boolean,
      default: false
    },
    vsanEnabled: {
      type: Boolean,
      default: false
    },
    utilizationTarget: {
      cpu: {
        type: Number,
        default: 85,
        min: 50,
        max: 95
      },
      memory: {
        type: Number,
        default: 85,
        min: 50,
        max: 95
      }
    }
  },
  capacity: {
    total: {
      cpu: {
        cores: {
          type: Number,
          required: true
        },
        mhz: {
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
        gb: {
          type: Number,
          required: true
        }
      }
    },
    available: {
      cpu: {
        cores: Number,
        mhz: Number
      },
      memory: {
        mb: Number
      },
      storage: {
        gb: Number
      }
    },
    allocated: {
      cpu: {
        cores: {
          type: Number,
          default: 0
        },
        mhz: {
          type: Number,
          default: 0
        }
      },
      memory: {
        mb: {
          type: Number,
          default: 0
        }
      },
      storage: {
        gb: {
          type: Number,
          default: 0
        }
      }
    }
  },
  hostCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSync: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

clusterSchema.index({ organization: 1, vCenterId: 1 }, { unique: true });
clusterSchema.index({ name: 1, organization: 1 });

clusterSchema.methods.calculateAvailableCapacity = function() {
  const cpuAvailable = Math.floor(this.capacity.total.cpu.cores * (this.configuration.utilizationTarget.cpu / 100)) - this.capacity.allocated.cpu.cores;
  const memoryAvailable = Math.floor(this.capacity.total.memory.mb * (this.configuration.utilizationTarget.memory / 100)) - this.capacity.allocated.memory.mb;
  const storageAvailable = this.capacity.total.storage.gb - this.capacity.allocated.storage.gb;

  this.capacity.available = {
    cpu: {
      cores: Math.max(0, cpuAvailable),
      mhz: Math.floor(this.capacity.total.cpu.mhz * (this.configuration.utilizationTarget.cpu / 100)) - this.capacity.allocated.cpu.mhz
    },
    memory: {
      mb: Math.max(0, memoryAvailable)
    },
    storage: {
      gb: Math.max(0, storageAvailable)
    }
  };

  return this.capacity.available;
};

clusterSchema.methods.getUtilization = function() {
  return {
    cpu: {
      percentage: (this.capacity.allocated.cpu.cores / this.capacity.total.cpu.cores) * 100,
      cores: this.capacity.allocated.cpu.cores,
      total: this.capacity.total.cpu.cores
    },
    memory: {
      percentage: (this.capacity.allocated.memory.mb / this.capacity.total.memory.mb) * 100,
      allocated: this.capacity.allocated.memory.mb,
      total: this.capacity.total.memory.mb
    },
    storage: {
      percentage: (this.capacity.allocated.storage.gb / this.capacity.total.storage.gb) * 100,
      allocated: this.capacity.allocated.storage.gb,
      total: this.capacity.total.storage.gb
    }
  };
};

module.exports = mongoose.model('Cluster', clusterSchema);