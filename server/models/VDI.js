const mongoose = require('mongoose');

const vdiSchema = new mongoose.Schema({
  ciName: {
    type: String,
    required: true,
    trim: true
  },
  vmId: {
    type: String,
    required: true,
    unique: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  assignedUser: {
    username: {
      type: String,
      required: true
    },
    email: String,
    manager: String,
    productGroup: String,
    groupType: {
      type: String,
      enum: ['SW', 'dev-ops', 'QA', 'UX', 'application', 'other']
    }
  },
  operatingSystem: {
    type: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    buildNumber: String
  },
  resourceAllocation: {
    cpu: {
      cores: {
        type: Number,
        required: true
      },
      reservedMhz: Number
    },
    memory: {
      allocated: {
        type: Number,
        required: true
      },
      reservation: Number
    },
    storage: {
      allocated: {
        type: Number,
        required: true
      },
      provisioned: Number
    },
    gpu: {
      allocated: {
        type: Number,
        default: 0
      },
      type: String
    }
  },
  esxiHost: {
    type: String,
    required: true
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VDIProfile'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'provisioning', 'maintenance'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

vdiSchema.index({ organization: 1, vmId: 1 });
vdiSchema.index({ 'assignedUser.username': 1 });
vdiSchema.index({ esxiHost: 1 });

module.exports = mongoose.model('VDI', vdiSchema);