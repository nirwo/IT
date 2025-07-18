const mongoose = require('mongoose');

const utilizationMetricsSchema = new mongoose.Schema({
  vdiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VDI',
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  metrics: {
    cpu: {
      usage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      cores: Number,
      mhz: Number
    },
    memory: {
      usage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      used: Number,
      total: Number
    },
    storage: {
      usage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      used: Number,
      total: Number
    },
    gpu: {
      usage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      memory: Number,
      temperature: Number
    }
  },
  network: {
    bytesIn: Number,
    bytesOut: Number,
    packetsIn: Number,
    packetsOut: Number
  },
  performance: {
    iops: Number,
    latency: Number,
    throughput: Number
  },
  collectionSource: {
    type: String,
    enum: ['vCenter', 'HyperV', 'Manual'],
    required: true
  }
}, {
  timestamps: false
});

utilizationMetricsSchema.index({ vdiId: 1, timestamp: -1 });
utilizationMetricsSchema.index({ timestamp: -1 });
utilizationMetricsSchema.index({ 'metrics.cpu.usage': 1 });
utilizationMetricsSchema.index({ 'metrics.memory.usage': 1 });

module.exports = mongoose.model('UtilizationMetrics', utilizationMetricsSchema);