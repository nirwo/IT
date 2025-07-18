const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  settings: {
    dataRetentionDays: {
      type: Number,
      default: 365
    },
    collectionInterval: {
      type: Number,
      default: 15
    },
    thresholds: {
      cpuIdle: {
        type: Number,
        default: 5
      },
      memoryIdle: {
        type: Number,
        default: 10
      },
      diskIdle: {
        type: Number,
        default: 15
      }
    }
  },
  integrations: {
    serviceNow: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String,
      username: String,
      encryptedPassword: String
    },
    vCenter: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String,
      username: String,
      encryptedPassword: String
    },
    jira: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String,
      username: String,
      encryptedApiToken: String
    },
    hyperV: {
      enabled: {
        type: Boolean,
        default: false
      },
      host: String,
      username: String,
      encryptedPassword: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organization', organizationSchema);