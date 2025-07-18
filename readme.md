readme
# IT RND Dashboard

## Overview
The IT RND Dashboard is a comprehensive solution designed to provide centralized monitoring and management of IT infrastructure resources, ticketing systems, and capacity planning for enterprise environments.

## Core Features

### Data Integration
- **ServiceNow API Integration**: Pull data from ServiceNow system for ticket management and service tracking
- **vCenter Dashboard**: Monitor and display resources from VMware vCenter infrastructure
- **Ticket Analytics**: Aggregate and display ticket counts from both ServiceNow and Jira systems
- **Hyper-V Support**: Pull data from Hyper-V infrastructure for comprehensive virtualization monitoring

### Machine Utilization Analysis
- **Usage Detection**: Identify active vs. idle machines within vCenter infrastructure
- **Resource Utilization Monitoring**: Track CPU, memory, and storage usage patterns over time
- **Right-sizing Analysis**: Compare allocated resources against actual usage to identify oversized VMs
- **Waste Detection**: Identify underutilized or unused machines consuming resources
- **Performance Optimization**: Recommend resource adjustments based on usage patterns
- **Automated Reporting**: Generate utilization reports with actionable insights

### Profile Management System
- **Dynamic Profile Creation**: Create custom resource profiles tailored to specific organizational needs
- **Profile Modification**: Edit existing profiles to reflect changing infrastructure requirements
- **Template System**: Use predefined templates for common VDI configurations
- **Profile Versioning**: Track changes to profiles over time with rollback capabilities
- **Import/Export**: Share profiles across organizations or backup profile configurations

### Allocation Dashboard
- **Resource Allocation Tracking**: Comprehensive view of allocated VDI resources
- **Configuration Item (CI) Management**: Track CI names and their associated configurations
- **User Assignment**: Monitor which users are assigned to specific VDI instances
- **Profile Association**: Link VDI instances to their corresponding resource profiles
- **Operating System Tracking**: Monitor OS versions and distributions across the infrastructure
- **Real-time Allocation Status**: Live updates on resource allocation and availability

### Multi-Tenancy & Access Control
- **Organization-based Data Sharing**: Secure data segregation per organization
- **Admin Organization**: Full access to all data across organizations
- **User Organizations**: Restricted access to organization-specific data only

## Architecture Goals

### Virtual Desktop Infrastructure (VDI) Monitoring
The solution focuses on monitoring key VDI resources:

#### Resource Monitoring
- **CPU Utilization**: Track processor usage across virtual environments
- **RAM Usage**: Monitor memory consumption and availability
- **Disk Space**: Storage utilization and capacity management

#### Machine Utilization Metrics
- **Usage Classification**: Categorize machines as active, idle, or abandoned
- **Resource Efficiency**: Calculate efficiency ratios for CPU, memory, and storage
- **Sizing Recommendations**: Identify oversized and undersized VMs
- **Waste Identification**: Highlight machines consuming resources without productive use
- **Historical Trends**: Track utilization patterns over time for optimization insights
- **Cost Analysis**: Calculate resource costs and potential savings from optimization

#### Allocation Dashboard Data Points
- **CI Name**: Configuration Item identification and naming
- **Associated User**: User assignments and ownership tracking
- **VDI Profile**: Applied resource profile for each VDI instance
- **Operating System**: OS type, version, and patch level information
- **Resource Allocation Status**: Current allocation state and utilization metrics

#### License Management
- **Citrix**: License tracking and usage monitoring
- **Lakeside**: Performance monitoring license management
- **One Identity**: Identity management license tracking

### Capacity Planning
- **Profile-based Planning**: Create resource profiles based on usage patterns
- **Profile Management**: Full CRUD operations for resource profiles
  - Create new profiles with custom resource specifications
  - Modify existing profiles to adapt to changing requirements
  - Delete outdated or unused profiles
  - Clone profiles for quick template creation
- **Utilization-based Optimization**: Leverage machine utilization data for capacity planning
- **Right-sizing Recommendations**: Automated suggestions for VM resource adjustments
- **Predictive Analytics**: Forecast resource needs based on historical data
- **Scalability Recommendations**: Automated suggestions for infrastructure scaling

## Technical Requirements

### Data Sources
- ServiceNow API
- VMware vCenter API
- Jira API
- Hyper-V Management API

### Profile Management Features
- **Profile Database**: Persistent storage for custom resource profiles
- **Profile Validation**: Ensure profile configurations are valid and feasible
- **Profile Analytics**: Track profile usage and performance metrics
- **Profile Recommendations**: AI-driven suggestions for profile optimization
- **Bulk Operations**: Mass create, update, or delete profiles

### Allocation Dashboard Technical Requirements
- **CI Database Integration**: Connect with Configuration Management Database (CMDB)
- **User Directory Integration**: Link with Active Directory or LDAP for user information
- **VDI Profile Mapping**: Database relationships between CIs and their assigned profiles
- **OS Inventory System**: Automated OS detection and tracking capabilities
- **Real-time Data Updates**: Live synchronization of allocation changes
- **Export Capabilities**: Generate reports and export allocation data

### Machine Utilization Analysis Technical Requirements
- **vCenter Performance Metrics**: Deep integration with vCenter performance counters
- **Historical Data Collection**: Time-series database for tracking utilization trends
- **Threshold Configuration**: Customizable thresholds for defining utilization states
- **Anomaly Detection**: Machine learning algorithms to identify unusual usage patterns
- **Resource Optimization Engine**: Algorithms for right-sizing recommendations
- **Cost Calculation Module**: Integration with cost models for waste analysis
- **Automated Alerting**: Notifications for severely underutilized or oversized machines

### Security
- Role-based access control (RBAC)
- Organization-level data isolation
- Secure API authentication

### Performance
- Real-time data synchronization
- Scalable architecture for multiple organizations
- Efficient data processing and visualization

## Getting Started

*[Development setup instructions will be added as the project progresses]*

## Contributing

*[Contributing guidelines will be added as the project evolves]*

## License

*[License information to be determined]*

## High-Level Requirements

### Primary Objective
Understand where we are standing with our VDI resources and their utilization to enable data-driven optimization decisions.

### Key Capabilities Required
- **Inactive User Identification**: Ability to see simple inactive users and be able to reclaim their VDI resources
- **Long-term Data Analysis**: Ability to view data over extended periods and per segments (e.g., team, business unit) to develop complex optimization strategies
- **Segmented Analytics**: Support for organizational hierarchy analysis and utilization patterns

### Data Collection Frequency
- **No real-time requirements**: Data will be viewed with acceptable delay
- **Optimized frequency**: Balanced approach to avoid excessive data generation while maintaining meaningful insights
- **High-level focus**: Target is strategic overview rather than second-by-second monitoring

## Data Collection Specifications

### Static Data (Per VDI)
Core information collected once or when changes occur:

#### User Assignment
- **Assignee/User**: Primary user associated with the VDI
- **User Classification**: Organizational belonging and role identification

#### Organizational Hierarchy (Ideal Implementation)
- **Product Group**: e.g., A10, Enlight, Common BE, FIFA, dev-ops
- **Type of Group**: SW, dev-ops, QA, other (UX/application)

#### Organizational Hierarchy (Compromise Implementation)
- **Manager Name**: If detailed product group classification is not achievable

#### System Configuration
- **Operating System**: OS type and version information
- **Resource Allocation**: Reserved resources per VDI
  - CPU allocation
  - GPU allocation (if applicable)
  - Memory allocation
  - Disk space allocation

### Dynamic Data (Per VDI)
Information collected at regular intervals:

#### User Activity Tracking
- **Login/Logout Events**: Complete event log with timestamps
- **Session Duration**: Calculated from login/logout events

#### Resource Utilization Monitoring
- **Disk Space Usage**: Sampled once daily
- **CPU Utilization**: Sampled every X minutes (frequency TBD)
- **GPU Utilization**: Sampled every X minutes (frequency TBD)
- **Memory Usage**: Sampled every X minutes (frequency TBD)

## Dashboard Components

### Filtering System
Comprehensive filtering capabilities to enable focused analysis:

#### Available Filters
- **Date Range**: Flexible time period selection
- **User**: Individual user filtering
- **Group/Manager**: Organizational unit filtering
- **Operating System**: OS type filtering
- **OS Version**: Specific version filtering
- **ESXi Host**: Infrastructure-based filtering

#### Filter Behavior
- **Combinatorial**: Users can select any combination of filters
- **Real-time Application**: Filters apply immediately to all dashboard components

### Primary Data Display

#### User Utilization Table
Main table view showing filtered results with the following characteristics:

##### Default Sorting
- **Primary Sort**: Login/logout count (ascending - least active users first)
- **Purpose**: Identify candidates for resource reclamation

##### Table Columns
- **VDI**: Virtual desktop identifier
- **User Name**: Associated user
- **Group/Manager**: Organizational assignment
- **Login Times**: Activity frequency metrics
- **OS**: Operating system type
- **OS Version**: Specific OS version
- **Resources**: Allocated resource summary (CPU, Memory, Storage, GPU)

##### Interactive Features
- **Multi-column Sorting**: Users can sort by any column
- **Row Selection**: Support for multi-user selection (up to 20 users)

### Detailed Analytics Views

#### Individual User Analysis
For selected users (up to 20), provide detailed graphical analysis:

##### Time-based Visualizations
- **Time Range**: User-configurable date range
- **Y-Axis**: Percentage utilization
- **X-Axis**: Time (quantization TBD)

##### Specific Metrics Graphs
1. **Login/Logout Events**: Event timeline visualization
2. **CPU & GPU Utilization**: Resource usage profile over time
3. **Memory Usage**: Memory consumption patterns
4. **Disk Usage**: Storage utilization trends

#### Use Cases Enabled
- **Resource Reclamation**: Identify completely inactive users for VDI reallocation
- **Dynamic Allocation Planning**: Analyze infrequent users for potential dynamic resource allocation
- **Capacity Planning**: Understand usage patterns for infrastructure scaling decisions
- **Cost Optimization**: Identify oversized allocations and optimization opportunities

## Implementation Plan

### Phase 1: Core Infrastructure
1. **Authentication System**: Multi-tenant user management with role-based access
2. **Data Collection Framework**: Automated gathering of static and dynamic VDI data
3. **Database Design**: Optimized schema for time-series data and organizational hierarchy

### Phase 2: Dashboard Development
1. **Filtering Interface**: Comprehensive filter system with real-time application
2. **User Utilization Table**: Interactive table with sorting and selection capabilities
3. **Basic Analytics**: Initial resource utilization visualizations

### Phase 3: Advanced Analytics
1. **Individual User Analysis**: Detailed graphical analysis for selected users
2. **Trend Analysis**: Long-term utilization patterns and forecasting
3. **Optimization Recommendations**: Automated suggestions for resource optimization

### Phase 4: Integration & Automation
1. **vCenter Integration**: Real-time data collection from VMware infrastructure
2. **ServiceNow Integration**: ITSM workflow automation for resource reclamation
3. **Alerting System**: Proactive notifications for optimization opportunities




