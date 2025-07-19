const UtilizationMetrics = require('../models/UtilizationMetrics');
const VDI = require('../models/VDI');
const logger = require('../config/logger');

class VMSizingAnalysisService {
  constructor() {
    this.analysisThresholds = {
      cpu: {
        oversized: 20,    // VM is oversized if avg CPU usage < 20%
        undersized: 85,   // VM is undersized if avg CPU usage > 85%
        optimal: { min: 20, max: 85 }
      },
      memory: {
        oversized: 30,    // VM is oversized if avg memory usage < 30%
        undersized: 90,   // VM is undersized if avg memory usage > 90%
        optimal: { min: 30, max: 90 }
      }
    };
  }

  async analyzeVMSizing(vdiId, hours = 24) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

      const vdi = await VDI.findById(vdiId);
      if (!vdi) {
        throw new Error('VDI not found');
      }

      const metrics = await UtilizationMetrics.find({
        vdiId: vdiId,
        timestamp: { $gte: startTime, $lte: endTime }
      }).sort({ timestamp: 1 });

      if (metrics.length === 0) {
        return {
          vdiId,
          vdiName: vdi.ciName,
          analysis: 'insufficient_data',
          message: 'Not enough performance data available for analysis',
          dataPoints: 0,
          timeRange: { start: startTime, end: endTime }
        };
      }

      const analysis = this.calculateSizingRecommendation(vdi, metrics);
      
      return {
        vdiId,
        vdiName: vdi.ciName,
        currentSpecs: vdi.resourceAllocation,
        ...analysis,
        dataPoints: metrics.length,
        timeRange: { start: startTime, end: endTime },
        analyzedAt: new Date()
      };

    } catch (error) {
      logger.error(`Error analyzing VM sizing for ${vdiId}:`, error);
      throw error;
    }
  }

  calculateSizingRecommendation(vdi, metrics) {
    const cpuUsages = metrics.map(m => m.metrics.cpu.usage).filter(u => u != null);
    const memoryUsages = metrics.map(m => m.metrics.memory.usage).filter(u => u != null);

    const cpuStats = this.calculateStats(cpuUsages);
    const memoryStats = this.calculateStats(memoryUsages);

    const cpuAnalysis = this.analyzeCPUSizing(vdi.resourceAllocation.cpu, cpuStats);
    const memoryAnalysis = this.analyzeMemorySizing(vdi.resourceAllocation.memory, memoryStats);

    const overallRecommendation = this.determineOverallRecommendation(cpuAnalysis, memoryAnalysis);

    return {
      cpu: cpuAnalysis,
      memory: memoryAnalysis,
      overall: overallRecommendation,
      utilizationStats: {
        cpu: cpuStats,
        memory: memoryStats
      }
    };
  }

  calculateStats(values) {
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
      p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
      count: values.length
    };
  }

  analyzeCPUSizing(currentCPU, cpuStats) {
    const avgUsage = cpuStats.avg;
    const p95Usage = cpuStats.p95;
    const currentCores = currentCPU.cores;

    let recommendation = 'optimal';
    let suggestedCores = currentCores;
    let reason = 'CPU allocation is optimal';
    let confidence = 'high';

    if (avgUsage < this.analysisThresholds.cpu.oversized) {
      recommendation = 'oversized';
      // Suggest reducing cores based on P95 usage with 20% headroom
      const targetUsage = 70; // Target 70% usage
      suggestedCores = Math.max(1, Math.ceil(currentCores * (p95Usage / targetUsage)));
      reason = `Average CPU usage is ${avgUsage.toFixed(1)}%, indicating over-allocation. P95 usage: ${p95Usage.toFixed(1)}%`;
      confidence = avgUsage < 10 ? 'high' : 'medium';
    } else if (p95Usage > this.analysisThresholds.cpu.undersized) {
      recommendation = 'undersized';
      // Suggest increasing cores to handle P95 load with 15% headroom
      const targetUsage = 75; // Target 75% usage at P95
      suggestedCores = Math.ceil(currentCores * (p95Usage / targetUsage));
      reason = `P95 CPU usage is ${p95Usage.toFixed(1)}%, indicating potential performance issues`;
      confidence = p95Usage > 95 ? 'high' : 'medium';
    }

    const potentialSavings = recommendation === 'oversized' 
      ? this.calculateCPUSavings(currentCores, suggestedCores)
      : null;

    return {
      recommendation,
      currentCores,
      suggestedCores,
      reason,
      confidence,
      utilizationLevel: this.getUtilizationLevel(avgUsage, this.analysisThresholds.cpu),
      potentialSavings
    };
  }

  analyzeMemorySizing(currentMemory, memoryStats) {
    const avgUsage = memoryStats.avg;
    const p95Usage = memoryStats.p95;
    const currentMB = currentMemory.allocated;

    let recommendation = 'optimal';
    let suggestedMB = currentMB;
    let reason = 'Memory allocation is optimal';
    let confidence = 'high';

    if (avgUsage < this.analysisThresholds.memory.oversized) {
      recommendation = 'oversized';
      // Suggest reducing memory based on P95 usage with 30% headroom
      const targetUsage = 70; // Target 70% usage
      suggestedMB = Math.max(512, Math.ceil(currentMB * (p95Usage / targetUsage)));
      // Round to nearest 512MB
      suggestedMB = Math.ceil(suggestedMB / 512) * 512;
      reason = `Average memory usage is ${avgUsage.toFixed(1)}%, indicating over-allocation. P95 usage: ${p95Usage.toFixed(1)}%`;
      confidence = avgUsage < 20 ? 'high' : 'medium';
    } else if (p95Usage > this.analysisThresholds.memory.undersized) {
      recommendation = 'undersized';
      // Suggest increasing memory to handle P95 load with 10% headroom
      const targetUsage = 80; // Target 80% usage at P95
      suggestedMB = Math.ceil(currentMB * (p95Usage / targetUsage));
      // Round to nearest 512MB
      suggestedMB = Math.ceil(suggestedMB / 512) * 512;
      reason = `P95 memory usage is ${p95Usage.toFixed(1)}%, indicating potential memory pressure`;
      confidence = p95Usage > 95 ? 'high' : 'medium';
    }

    const potentialSavings = recommendation === 'oversized' 
      ? this.calculateMemorySavings(currentMB, suggestedMB)
      : null;

    return {
      recommendation,
      currentMB,
      suggestedMB,
      reason,
      confidence,
      utilizationLevel: this.getUtilizationLevel(avgUsage, this.analysisThresholds.memory),
      potentialSavings
    };
  }

  determineOverallRecommendation(cpuAnalysis, memoryAnalysis) {
    const priorities = { oversized: 3, undersized: 2, optimal: 1 };
    
    const cpuPriority = priorities[cpuAnalysis.recommendation];
    const memoryPriority = priorities[memoryAnalysis.recommendation];

    let overallRecommendation = 'optimal';
    let primaryConcern = null;
    let secondaryConcern = null;

    if (cpuPriority > memoryPriority) {
      overallRecommendation = cpuAnalysis.recommendation;
      primaryConcern = 'cpu';
      if (memoryAnalysis.recommendation !== 'optimal') {
        secondaryConcern = 'memory';
      }
    } else if (memoryPriority > cpuPriority) {
      overallRecommendation = memoryAnalysis.recommendation;
      primaryConcern = 'memory';
      if (cpuAnalysis.recommendation !== 'optimal') {
        secondaryConcern = 'cpu';
      }
    } else if (cpuAnalysis.recommendation === memoryAnalysis.recommendation && cpuAnalysis.recommendation !== 'optimal') {
      overallRecommendation = cpuAnalysis.recommendation;
      primaryConcern = 'both';
    }

    return {
      recommendation: overallRecommendation,
      primaryConcern,
      secondaryConcern,
      actionPriority: this.getActionPriority(overallRecommendation, primaryConcern),
      summary: this.generateSummary(cpuAnalysis, memoryAnalysis, overallRecommendation)
    };
  }

  getUtilizationLevel(usage, thresholds) {
    if (usage < thresholds.oversized) return 'low';
    if (usage > thresholds.undersized) return 'high';
    return 'optimal';
  }

  getActionPriority(recommendation, primaryConcern) {
    if (recommendation === 'undersized') return 'high';
    if (recommendation === 'oversized' && primaryConcern === 'both') return 'medium';
    if (recommendation === 'oversized') return 'low';
    return 'none';
  }

  calculateCPUSavings(currentCores, suggestedCores) {
    const coresSaved = currentCores - suggestedCores;
    const percentSaved = (coresSaved / currentCores) * 100;
    
    return {
      coresSaved,
      percentSaved: percentSaved.toFixed(1),
      estimatedMonthlySaving: this.estimateMonthlyCostSaving('cpu', coresSaved)
    };
  }

  calculateMemorySavings(currentMB, suggestedMB) {
    const mbSaved = currentMB - suggestedMB;
    const percentSaved = (mbSaved / currentMB) * 100;
    
    return {
      mbSaved,
      gbSaved: (mbSaved / 1024).toFixed(1),
      percentSaved: percentSaved.toFixed(1),
      estimatedMonthlySaving: this.estimateMonthlyCostSaving('memory', mbSaved)
    };
  }

  estimateMonthlyCostSaving(resourceType, amount) {
    // Rough estimates - these should be configurable per organization
    const rates = {
      cpu: 15, // $15 per core per month
      memory: 0.5 // $0.50 per GB per month
    };

    if (resourceType === 'cpu') {
      return (amount * rates.cpu).toFixed(2);
    } else if (resourceType === 'memory') {
      const gb = amount / 1024;
      return (gb * rates.memory).toFixed(2);
    }
    
    return '0.00';
  }

  generateSummary(cpuAnalysis, memoryAnalysis, overallRecommendation) {
    if (overallRecommendation === 'optimal') {
      return 'VM is optimally sized for current workload';
    }
    
    if (overallRecommendation === 'oversized') {
      if (cpuAnalysis.recommendation === 'oversized' && memoryAnalysis.recommendation === 'oversized') {
        return 'VM is over-allocated for both CPU and memory. Consider downsizing to reduce costs.';
      } else if (cpuAnalysis.recommendation === 'oversized') {
        return 'VM has excessive CPU allocation. Consider reducing CPU cores.';
      } else {
        return 'VM has excessive memory allocation. Consider reducing memory.';
      }
    }
    
    if (overallRecommendation === 'undersized') {
      if (cpuAnalysis.recommendation === 'undersized' && memoryAnalysis.recommendation === 'undersized') {
        return 'VM is under-allocated for both CPU and memory. Upgrade recommended for better performance.';
      } else if (cpuAnalysis.recommendation === 'undersized') {
        return 'VM needs more CPU cores to handle current workload effectively.';
      } else {
        return 'VM needs more memory to handle current workload effectively.';
      }
    }
    
    return 'Analysis complete';
  }

  async analyzeBulkVMs(organizationId, hours = 24) {
    try {
      const vdis = await VDI.find({ 
        organization: organizationId,
        status: 'active'
      }).select('_id ciName resourceAllocation');

      const analyses = [];
      
      for (const vdi of vdis) {
        try {
          const analysis = await this.analyzeVMSizing(vdi._id, hours);
          analyses.push(analysis);
        } catch (error) {
          logger.error(`Failed to analyze VM ${vdi.ciName}:`, error);
          analyses.push({
            vdiId: vdi._id,
            vdiName: vdi.ciName,
            analysis: 'error',
            message: error.message
          });
        }
      }

      return this.generateBulkSummary(analyses);
    } catch (error) {
      logger.error('Error in bulk VM analysis:', error);
      throw error;
    }
  }

  generateBulkSummary(analyses) {
    const summary = {
      total: analyses.length,
      optimal: 0,
      oversized: 0,
      undersized: 0,
      insufficient_data: 0,
      error: 0,
      totalPotentialSavings: { cpu: 0, memory: 0, estimated: 0 }
    };

    const recommendations = [];

    analyses.forEach(analysis => {
      if (analysis.overall) {
        summary[analysis.overall.recommendation]++;
        
        if (analysis.overall.recommendation === 'oversized') {
          // Calculate potential savings
          if (analysis.cpu.potentialSavings) {
            summary.totalPotentialSavings.cpu += analysis.cpu.potentialSavings.coresSaved || 0;
            summary.totalPotentialSavings.estimated += parseFloat(analysis.cpu.potentialSavings.estimatedMonthlySaving || 0);
          }
          if (analysis.memory.potentialSavings) {
            summary.totalPotentialSavings.memory += parseFloat(analysis.memory.potentialSavings.gbSaved || 0);
            summary.totalPotentialSavings.estimated += parseFloat(analysis.memory.potentialSavings.estimatedMonthlySaving || 0);
          }
        }

        recommendations.push({
          vdiId: analysis.vdiId,
          vdiName: analysis.vdiName,
          recommendation: analysis.overall.recommendation,
          priority: analysis.overall.actionPriority,
          summary: analysis.overall.summary,
          confidence: Math.min(
            analysis.cpu.confidence === 'high' ? 3 : analysis.cpu.confidence === 'medium' ? 2 : 1,
            analysis.memory.confidence === 'high' ? 3 : analysis.memory.confidence === 'medium' ? 2 : 1
          )
        });
      } else {
        summary[analysis.analysis || 'error']++;
      }
    });

    // Sort recommendations by priority and confidence
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    return {
      summary,
      recommendations: recommendations.slice(0, 50), // Top 50 recommendations
      analyzedAt: new Date()
    };
  }
}

module.exports = VMSizingAnalysisService;