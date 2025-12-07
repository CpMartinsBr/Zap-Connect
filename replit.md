# WhatsApp CRM

## Overview

A professional CRM (Customer Relationship Management) application with a WhatsApp-inspired interface. The system manages contacts, messages, product inventory, and orders. Built as a full-stack web application with a React frontend and Express backend, it provides an intuitive messaging-style interface for customer relationship management with integrated inventory and order management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework and Build Tools**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server, chosen for fast hot module replacement and optimized production builds
- Wouter for lightweight client-side routing instead of React Router to reduce bundle size
- TanStack Query (React Query) for server state management, caching, and synchronization

**UI Component System**
- Radix UI primitives as the foundation for accessible, unstyled components
- Shadcn/ui component library built on Radix UI with Tailwind CSS styling
- Lucide React for consistent iconography
- Custom theming using CSS variables for colors and spacing, following the "new-york" style variant

**State Management Strategy**
- TanStack Query manages all server state (contacts, messages, products, orders)
- Local component state using React hooks for UI-specific state
- No global state management library needed due to effective server state caching

**Styling Approach**
- Tailwind CSS v4 with custom configuration
- CSS variables for theming (light/dark mode support structure)
- Custom animations using tw-animate-css
- WhatsApp-inspired color scheme with professional CRM aesthetics

**Code Organization**
- `/client/src/components` - Reusable UI components including chat interface, CRM panel, and layout
- `/client/src/components/ui` - Shadcn/ui component library
- `/client/src/pages` - Route-based page components (home, inventory, orders)
- `/client/src/lib` - Utility functions, API client, and custom hooks
- `/client/src/hooks` - Reusable React hooks
- Path aliases configured for clean imports (@/, @shared/, @assets/)

### Backend Architecture

**Server Framework**
- Express.js for HTTP server with REST API endpoints
- Node.js HTTP server for potential WebSocket support
- TypeScript for type safety across the entire stack

**API Design**
- RESTful endpoints organized by resource type (contacts, messages, products, orders)
- CRUD operations for all main entities
- JSON request/response format
- Zod validation on all incoming data using schemas derived from Drizzle ORM

**Data Access Layer**
- Storage abstraction layer (`server/storage.ts`) provides interface for all database operations
- Separation of concerns between route handlers and data access logic
- Typed interfaces for all database operations using shared schema types

**Request Processing**
- Express JSON middleware with raw body capture for webhook support
- URL-encoded form data support
- Custom logging middleware tracking request duration and responses
- Error handling with appropriate HTTP status codes

**Code Organization**
- `/server/index.ts` - Main server entry point with middleware setup
- `/server/routes.ts` - API route definitions
- `/server/storage.ts` - Database abstraction layer
- `/server/static.ts` - Static file serving for production
- `/server/vite.ts` - Vite integration for development mode
- `/server/seed.ts` - Database seeding utilities

### Data Storage

**ORM and Database**
- Drizzle ORM chosen for type-safe database queries with minimal overhead
- PostgreSQL as the relational database (configured but implementation-agnostic)
- Schema-first approach with TypeScript types generated from Drizzle schemas

**Schema Design**
- **Contacts**: Core CRM entity with name, phone, email, company, deal stage, tags, value, and notes
- **Messages**: Linked to contacts with content, sender ID, status, and timestamps
- **Products**: Inventory items with name, description, category, price, stock quantity, unit, and SKU
- **Orders**: Customer orders with contact reference, status, total, delivery date, and notes
- **Order Items**: Join table linking orders to products with quantity and unit price

**Type Safety**
- Drizzle-zod integration generates Zod schemas from database schema
- Insert and update schemas exclude auto-generated fields
- Shared types used across frontend and backend via `/shared/schema.ts`

**Data Relationships**
- One-to-many: Contact → Messages
- One-to-many: Contact → Orders
- Many-to-many: Orders ↔ Products (through OrderItems)
- Cascading deletes configured where appropriate (e.g., deleting contact removes messages)

### Build and Deployment

**Development Mode**
- Vite dev server on port 5000 with HMR
- Express server with Vite middleware integration
- Hot reload for both client and server code
- Source maps for debugging

**Production Build**
- Custom build script using esbuild for server bundling
- Selective dependency bundling to reduce cold start times
- Vite production build for optimized client assets
- Static file serving from Express server

**Build Optimization**
- Server dependencies allowlist for bundling frequently-used packages
- Tree-shaking and minification
- Code splitting for client-side routes
- Asset optimization through Vite

## External Dependencies

### Third-Party UI Libraries
- Radix UI component primitives (accordion, dialog, dropdown, select, etc.)
- Embla Carousel for carousel functionality
- CMDK for command palette pattern
- React Hook Form with Zod resolver for form validation

### Database and ORM
- Drizzle ORM for type-safe database operations
- Drizzle Kit for schema migrations
- node-postgres (pg) as PostgreSQL client
- PostgreSQL database (connection via DATABASE_URL environment variable)

### Development Tools
- Replit-specific Vite plugins (runtime error modal, cartographer, dev banner)
- Custom meta images plugin for OpenGraph tag management
- TypeScript compiler with strict mode enabled
- ESBuild for server bundling

### Utility Libraries
- date-fns for date manipulation and formatting
- nanoid for ID generation
- clsx and tailwind-merge for className utilities
- class-variance-authority (cva) for component variants
- zod-validation-error for user-friendly error messages

### Potential Future Integrations
- WebSocket support (HTTP server already configured)
- Session management infrastructure present (connect-pg-simple referenced)
- File upload capabilities (Multer dependency suggests multipart form data handling)