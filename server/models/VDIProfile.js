const mongoose = require('mongoose');

const vdiProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  resourceSpecs: {
    cpu: {
      cores: {
        type: Number,
        required: true,
        min: 1,
        max: 32
      },
      reservedMhz: {
        type: Number,
        min: 0
      }
    },
    memory: {
      allocated: {
        type: Number,
        required: true,
        min: 1024
      },
      reservation: {
        type: Number,
        min: 0
      }
    },
    storage: {
      allocated: {
        type: Number,
        required: true,
        min: 20480
      },
      type: {
        type: String,
        enum: ['SSD', 'HDD', 'NVMe'],
        default: 'SSD'
      }
    },
    gpu: {
      allocated: {
        type: Number,
        default: 0,
        min: 0
      },
      type: {
        type: String,
        enum: ['NVIDIA', 'AMD', 'Intel', 'None'],
        default: 'None'
      }
    }
  },
  operatingSystem: {
    type: {
      type: String,
      required: true,
      enum: ['Windows', 'Linux', 'macOS']
    },
    version: String,
    template: String
  },
  targetAudience: {
    type: String,
    enum: ['developer', 'designer', 'analyst', 'general', 'power-user'],
    default: 'general'
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  usage: {
    totalInstances: {
      type: Number,
      default: 0
    },
    activeInstances: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

vdiProfileSchema.index({ organization: 1, name: 1 }, { unique: true });
vdiProfileSchema.index({ isActive: 1 });
vdiProfileSchema.index({ targetAudience: 1 });

module.exports = mongoose.model('VDIProfile', vdiProfileSchema);