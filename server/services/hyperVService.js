const { spawn } = require('child_process');
const logger = require('../config/logger');

class HyperVService {
  constructor(config) {
    this.config = config;
  }

  async executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn('powershell.exe', ['-Command', command, ...args]);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async getVirtualMachines() {
    try {
      const command = `Get-VM -ComputerName ${this.config.host} | ConvertTo-Json`;
      const result = await this.executeCommand(command);
      
      const vms = JSON.parse(result);
      return Array.isArray(vms) ? vms : [vms];
    } catch (error) {
      logger.error('Failed to fetch VMs from Hyper-V:', error.message);
      throw error;
    }
  }

  async getVMDetails(vmName) {
    try {
      const commands = [
        `Get-VM -ComputerName ${this.config.host} -Name "${vmName}" | ConvertTo-Json`,
        `Get-VMProcessor -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`,
        `Get-VMMemory -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`,
        `Get-VMHardDiskDrive -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`,
        `Get-VMNetworkAdapter -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`
      ];

      const results = await Promise.all(commands.map(cmd => this.executeCommand(cmd)));
      
      return {
        vm: JSON.parse(results[0]),
        processor: JSON.parse(results[1]),
        memory: JSON.parse(results[2]),
        storage: JSON.parse(results[3]),
        network: JSON.parse(results[4])
      };
    } catch (error) {
      logger.error(`Failed to fetch VM details for ${vmName}:`, error.message);
      throw error;
    }
  }

  async getVMPerformanceCounters(vmName) {
    try {
      const counters = [
        `\\Hyper-V Hypervisor Virtual Processor(${vmName}:*)\\% Guest Run Time`,
        `\\Hyper-V Dynamic Memory VM(${vmName})\\Physical Memory`,
        `\\Hyper-V Virtual Storage Device(${vmName}:*)\\Read Bytes/sec`,
        `\\Hyper-V Virtual Storage Device(${vmName}:*)\\Write Bytes/sec`,
        `\\Hyper-V Virtual Network Adapter(${vmName}:*)\\Bytes/sec`
      ];

      const command = `Get-Counter -ComputerName ${this.config.host} -Counter "${counters.join('","')}" -SampleInterval 1 -MaxSamples 1 | ConvertTo-Json`;
      const result = await this.executeCommand(command);
      
      return JSON.parse(result);
    } catch (error) {
      logger.error(`Failed to fetch performance counters for ${vmName}:`, error.message);
      throw error;
    }
  }

  async getHyperVHosts() {
    try {
      const command = `Get-VMHost -ComputerName ${this.config.host} | ConvertTo-Json`;
      const result = await this.executeCommand(command);
      
      return JSON.parse(result);
    } catch (error) {
      logger.error('Failed to fetch Hyper-V hosts:', error.message);
      throw error;
    }
  }

  async getVMResourceUsage(vmName, sampleCount = 5) {
    try {
      const command = `
        $samples = @()
        for ($i = 0; $i -lt ${sampleCount}; $i++) {
          $cpu = Get-Counter "\\Hyper-V Hypervisor Virtual Processor(${vmName}:*)\\% Guest Run Time" -ComputerName ${this.config.host} -ErrorAction SilentlyContinue
          $memory = Get-Counter "\\Hyper-V Dynamic Memory VM(${vmName})\\Physical Memory" -ComputerName ${this.config.host} -ErrorAction SilentlyContinue
          
          $sample = @{
            Timestamp = Get-Date
            CPU = if ($cpu) { ($cpu.CounterSamples | Measure-Object -Property CookedValue -Average).Average } else { 0 }
            Memory = if ($memory) { $memory.CounterSamples[0].CookedValue } else { 0 }
          }
          
          $samples += $sample
          Start-Sleep -Seconds 2
        }
        
        $samples | ConvertTo-Json
      `;

      const result = await this.executeCommand(command);
      return JSON.parse(result);
    } catch (error) {
      logger.error(`Failed to fetch resource usage for ${vmName}:`, error.message);
      throw error;
    }
  }

  async getVMReplicationStatus(vmName) {
    try {
      const command = `Get-VMReplication -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`;
      const result = await this.executeCommand(command);
      
      return JSON.parse(result);
    } catch (error) {
      logger.error(`Failed to fetch replication status for ${vmName}:`, error.message);
      return null;
    }
  }

  async getVMCheckpoints(vmName) {
    try {
      const command = `Get-VMCheckpoint -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`;
      const result = await this.executeCommand(command);
      
      const checkpoints = JSON.parse(result);
      return Array.isArray(checkpoints) ? checkpoints : [checkpoints];
    } catch (error) {
      logger.error(`Failed to fetch checkpoints for ${vmName}:`, error.message);
      throw error;
    }
  }

  transformVMData(vmData, vmDetails) {
    const vm = vmDetails.vm;
    const processor = vmDetails.processor;
    const memory = vmDetails.memory;
    const storage = vmDetails.storage;

    return {
      vmId: vm.VMId,
      name: vm.VMName,
      state: vm.State,
      status: vm.Status,
      uptime: vm.Uptime,
      cpu: {
        count: processor.Count,
        reserve: processor.Reserve,
        maximum: processor.Maximum,
        relativeWeight: processor.RelativeWeight
      },
      memory: {
        startup: memory.Startup,
        minimum: memory.Minimum,
        maximum: memory.Maximum,
        assigned: memory.Assigned,
        demand: memory.Demand
      },
      storage: Array.isArray(storage) ? storage.map(disk => ({
        path: disk.Path,
        diskNumber: disk.DiskNumber,
        size: disk.Size
      })) : [],
      generation: vm.Generation,
      version: vm.Version,
      creationTime: vm.CreationTime,
      smartPagingFilePath: vm.SmartPagingFilePath,
      snapshotFileLocation: vm.SnapshotFileLocation
    };
  }

  async testConnection() {
    try {
      const command = `Test-NetConnection -ComputerName ${this.config.host} -Port 5985`;
      const result = await this.executeCommand(command);
      
      return result.includes('TcpTestSucceeded : True');
    } catch (error) {
      logger.error('Failed to test Hyper-V connection:', error.message);
      return false;
    }
  }

  async getVMIntegrationServices(vmName) {
    try {
      const command = `Get-VMIntegrationService -ComputerName ${this.config.host} -VMName "${vmName}" | ConvertTo-Json`;
      const result = await this.executeCommand(command);
      
      const services = JSON.parse(result);
      return Array.isArray(services) ? services : [services];
    } catch (error) {
      logger.error(`Failed to fetch integration services for ${vmName}:`, error.message);
      throw error;
    }
  }
}

module.exports = HyperVService;