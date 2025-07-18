const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  vdiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VDI',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['login', 'logout', 'session_start', 'session_end', 'disconnect', 'reconnect'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  sessionId: {
    type: String,
    required: true
  },
  sessionDuration: {
    type: Number,
    min: 0
  },
  clientInfo: {
    ipAddress: String,
    userAgent: String,
    clientType: {
      type: String,
      enum: ['desktop', 'web', 'mobile', 'thin-client']
    }
  },
  source: {
    type: String,
    enum: ['vCenter', 'HyperV', 'Citrix', 'RDP', 'Manual'],
    required: true
  }
}, {
  timestamps: false
});

userActivitySchema.index({ vdiId: 1, timestamp: -1 });
userActivitySchema.index({ username: 1, timestamp: -1 });
userActivitySchema.index({ eventType: 1, timestamp: -1 });
userActivitySchema.index({ sessionId: 1 });

userActivitySchema.statics.getSessionDuration = async function(sessionId) {
  const activities = await this.find({ sessionId }).sort({ timestamp: 1 });
  
  if (activities.length < 2) return 0;
  
  const start = activities.find(a => ['login', 'session_start'].includes(a.eventType));
  const end = activities.find(a => ['logout', 'session_end'].includes(a.eventType));
  
  if (start && end) {
    return Math.max(0, (end.timestamp - start.timestamp) / (1000 * 60));
  }
  
  return 0;
};

module.exports = mongoose.model('UserActivity', userActivitySchema);