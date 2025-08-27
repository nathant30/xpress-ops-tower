# Xpress Ops Tower

Real-time operations command center with XPRESS Design System integration. Built for the Philippines timezone with mobile-first responsive design.

## 🚀 Features

- **Next.js 14** - Latest React framework with App Router
- **TypeScript** - Full type safety and enhanced developer experience
- **XPRESS Design System** - Consistent UI components and design tokens
- **Tailwind CSS** - Utility-first CSS framework with custom design tokens
- **Real-time Dashboard** - Live operations monitoring and alerts
- **Mobile-First** - Responsive design optimized for Philippines market
- **Philippines Timezone** - Default timezone set to Asia/Manila
- **Performance Optimized** - Built for real-time dashboard performance

## 🏗️ Project Structure

```
xpress-ops-tower/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/
│   │   ├── xpress/            # XPRESS Design System components
│   │   ├── ui/                # Reusable UI components
│   │   └── features/          # Feature-specific components
│   ├── lib/                   # Utility libraries
│   ├── types/                 # TypeScript type definitions
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   └── styles/                # Global styles and CSS
├── public/                    # Static assets
├── database/                  # Database schemas and migrations
├── monitoring/                # Monitoring configuration
├── scripts/                   # Build and utility scripts
└── docs/                      # Project documentation
```

## 🎨 XPRESS Design System

The project enforces strict adherence to the XPRESS Design System:

- **Design Tokens** - Colors, typography, spacing, and shadows
- **Components** - Button, Card, Badge, and more
- **Enforcement** - Automated checking and fixing of design system compliance
- **TypeScript** - Fully typed component APIs

### Available Components

- `Button` - Primary, secondary, tertiary, and semantic variants
- `Card` - Default, elevated, outlined, and ghost variants  
- `Badge` - Status indicators with dot animations
- `StatusBadge` - Specialized for operational status

## 🛠️ Development Setup

### Prerequisites

- Node.js 18.0.0 or later
- npm 8.0.0 or later

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd xpress-ops-tower
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Start development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript type checking

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### XPRESS Compliance
- `npm run xpress:check` - Check XPRESS Design System compliance
- `npm run xpress:enforce` - Automatically fix XPRESS violations

### Testing
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## 🎯 XPRESS Design System Enforcement

The project includes automated enforcement of XPRESS Design System compliance:

### Enforcement Scripts
- **xpress:check** - Validates that only approved XPRESS classes are used
- **xpress:enforce** - Automatically replaces common violations with XPRESS alternatives

### Pre-commit Hooks
- ESLint and Prettier formatting
- XPRESS compliance checking
- TypeScript type checking

### VS Code Integration
- Automatic formatting on save
- XPRESS class validation
- IntelliSense for design tokens

## 🌏 Philippines-Specific Features

- **Timezone** - Default timezone set to Asia/Manila
- **Locale** - English (Philippines) locale settings
- **Date/Time Formatting** - Philippines-friendly formats
- **Mobile-First** - Optimized for mobile usage patterns in Philippines

## 🏢 Multi-Agent Development

The project is structured for collaborative development by multiple specialized agents:

- **Foundation Agent** - Project setup and XPRESS Design System (completed)
- **Dashboard Agent** - Real-time dashboard implementation
- **API Agent** - Backend API and data layer
- **Auth Agent** - Authentication and user management
- **Alert Agent** - Alert and notification system
- **Testing Agent** - Comprehensive testing suite

## 📝 TypeScript Types

Comprehensive TypeScript interfaces are provided for:

- **Dashboard** - Widget configuration and layouts
- **Operations** - Service monitoring and incidents
- **Metrics** - Performance and business metrics
- **Alerts** - Alert rules and notifications
- **Users** - Authentication and permissions
- **API** - Request/response types and WebSocket

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
NEXT_PUBLIC_APP_NAME="Xpress Ops Tower"
NEXT_PUBLIC_DEFAULT_TIMEZONE="Asia/Manila"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
DATABASE_URL="postgresql://localhost:5432/xpress_ops_tower"
```

### Tailwind Configuration

Custom design tokens are configured in `tailwind.config.ts`:
- XPRESS color palette
- Philippines mobile breakpoints
- Custom shadows and animations
- Typography scale

## 📊 Performance

The project is optimized for real-time dashboard performance:

- **Bundle Splitting** - Separate chunks for XPRESS components
- **Image Optimization** - Next.js Image component with WebP/AVIF support
- **Caching** - Strategic caching for API responses and static assets
- **Real-time Updates** - WebSocket integration for live data

## 🧪 Testing Strategy

- **Unit Tests** - Jest and React Testing Library
- **Component Tests** - XPRESS component testing
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Playwright for full user workflows
- **Visual Regression** - Component screenshot testing

## 🚀 Deployment

The project is configured for production deployment with:

- **Standalone Output** - Optimized Docker-ready builds
- **Static Asset Optimization** - Automatic compression and caching
- **Environment-specific Configuration** - Development, staging, production
- **Health Checks** - Built-in health check endpoints

## 📖 Documentation

- `docs/` - Detailed technical documentation
- Component Storybook - Interactive component documentation
- API Documentation - OpenAPI/Swagger specifications
- Deployment Guide - Infrastructure and deployment instructions

## 🤝 Contributing

1. Follow the XPRESS Design System guidelines
2. Ensure TypeScript strict mode compliance
3. Run quality checks before committing:
   ```bash
   npm run type-check
   npm run lint
   npm run xpress:check
   npm test
   ```
4. Use conventional commit messages
5. Update documentation for new features

## 📄 License

This project is proprietary and confidential.

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [XPRESS Design System Guide](./docs/xpress-design-system.md)

---

Built with ❤️ for real-time operations in the Philippines 🇵🇭