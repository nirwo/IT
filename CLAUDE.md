# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The IT RND Dashboard is a comprehensive VDI (Virtual Desktop Infrastructure) monitoring and management solution built with Node.js/Express backend and React frontend. It provides centralized monitoring, analytics, and management capabilities for enterprise VDI environments.

## Architecture

### Backend (Node.js/Express)
- **Models**: MongoDB schemas for VDI instances, users, organizations, profiles, metrics, and activity tracking
- **Services**: API integrations for ServiceNow, vCenter, Jira, and Hyper-V
- **Controllers**: Business logic for VDI management, profiles, and authentication
- **Middleware**: Authentication, authorization, and multi-tenancy controls
- **Data Collection**: Automated metrics collection and user activity tracking

### Frontend (React)
- **Context-based state management** for authentication and theming
- **Responsive design** with mobile-first approach
- **Chart visualizations** using Recharts library
- **Component-based architecture** with reusable UI components

### Key Features
- **Multi-tenant architecture** with organization-based data isolation
- **Real-time data collection** from multiple virtualization platforms
- **Advanced analytics** with utilization tracking and optimization recommendations
- **Profile management** for standardized resource allocation
- **Comprehensive filtering** and search capabilities
- **Role-based access control** with granular permissions

## Commands

### Development
```bash
# Install dependencies for both frontend and backend
npm run install-all

# Start development environment (both frontend and backend)
npm run dev

# Start backend only
npm run server

# Start frontend only
npm run client
```

### Building and Production
```bash
# Build frontend for production
npm run build

# Start production server
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.js
```

### Linting and Code Quality
```bash
# Run ESLint
npm run lint

# Run TypeScript type checking
npm run typecheck
```

### Database
```bash
# The application uses MongoDB
# Connection string: mongodb://localhost:27017/it-rnd-dashboard
# Models are defined in server/models/
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.yml up -d
```

## Project Structure

### Backend Structure
- `server/models/` - MongoDB schemas and models
- `server/controllers/` - API endpoint handlers
- `server/services/` - External API integrations and data collection
- `server/middleware/` - Authentication and authorization middleware
- `server/routes/` - API route definitions
- `server/config/` - Database and logging configuration

### Frontend Structure
- `client/src/components/` - Reusable UI components
- `client/src/pages/` - Page components for different routes
- `client/src/contexts/` - React context providers
- `client/src/services/` - API service layer
- `client/src/hooks/` - Custom React hooks

### Key Models
- **VDI**: Virtual desktop instances with resource allocation and user assignments
- **User**: User accounts with role-based permissions
- **Organization**: Multi-tenant organization management
- **VDIProfile**: Resource allocation templates
- **UtilizationMetrics**: Time-series performance data
- **UserActivity**: Login/logout and session tracking

## API Integration Services

### vCenter Service (`server/services/vCenterService.js`)
- Connects to VMware vCenter for VM monitoring
- Retrieves VM details, performance metrics, and host information
- Handles authentication and session management

### ServiceNow Service (`server/services/serviceNowService.js`)
- ITSM integration for ticket management
- CI/CD pipeline integration
- User and department information retrieval

### Jira Service (`server/services/jiraService.js`)
- Issue tracking and project management integration
- User story and bug tracking
- Metrics and analytics from Jira projects

### Hyper-V Service (`server/services/hyperVService.js`)
- Microsoft Hyper-V virtualization platform integration
- PowerShell-based VM management and monitoring
- Performance counter collection

## Data Collection Framework

The `DataCollectionService` (`server/services/dataCollectionService.js`) orchestrates:
- **Scheduled metrics collection** (configurable intervals)
- **User activity tracking** (login/logout events)
- **Static data synchronization** (daily updates)
- **Multi-platform support** (vCenter, Hyper-V)

## Authentication & Authorization

- **JWT-based authentication** with configurable expiration
- **Multi-tenant access control** with organization isolation
- **Role-based permissions**: read, write, admin, profile_management
- **Admin organization** with cross-tenant access

## Environment Configuration

Key environment variables:
- `MONGODB_URI` - Database connection string
- `JWT_SECRET` - JWT signing secret
- `COLLECTION_INTERVAL_MINUTES` - Metrics collection frequency
- `SERVICENOW_URL`, `VCENTER_URL`, `JIRA_URL`, `HYPERV_HOST` - Integration endpoints
- `LOG_LEVEL` - Logging verbosity

## Testing Strategy

- **Unit tests** for models and services
- **Integration tests** for API endpoints
- **Authentication tests** for security validation
- **Mock external services** for isolated testing
- **Coverage reporting** with Jest

## Deployment Architecture

- **Docker containerization** with multi-stage builds
- **Nginx reverse proxy** with SSL termination
- **MongoDB persistence** with volume mounting
- **Health checks** and monitoring endpoints
- **Production-ready logging** and error handling

## Development Guidelines

### Code Organization
- Follow the existing folder structure and naming conventions
- Use consistent error handling patterns
- Implement proper logging throughout the application
- Maintain separation of concerns between layers

### Security Best Practices
- Never commit sensitive information (API keys, passwords)
- Use environment variables for configuration
- Implement proper input validation and sanitization
- Follow OWASP security guidelines

### Performance Considerations
- Optimize database queries with proper indexing
- Implement caching strategies for frequently accessed data
- Use pagination for large datasets
- Monitor and optimize API response times

## Common Development Tasks

### Adding New VDI Integrations
1. Create new service in `server/services/`
2. Add integration configuration to Organization model
3. Update DataCollectionService to include new platform
4. Add integration settings to frontend Settings page

### Creating New Dashboard Components
1. Design component in `client/src/components/`
2. Add route in `client/src/App.js`
3. Create corresponding page component
4. Implement API endpoints if needed

### Adding New Metrics
1. Update UtilizationMetrics model schema
2. Modify data collection services to gather new metrics
3. Update frontend charts and visualizations
4. Add new metrics to analytics calculations