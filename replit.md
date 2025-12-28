# Bakery CRM

## Overview

A professional CRM (Customer Relationship Management) application designed for small bakeries and confectioneries. The system manages contacts with delivery addresses, product inventory with bakery-specific categories, orders with payment tracking, and recipe/ingredient management. Built as a full-stack web application with a React frontend and Express backend, featuring Replit Auth with email whitelist for access control.

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
- Clean, minimalist design with professional CRM aesthetics

**Code Organization**
- `/client/src/components` - Reusable UI components including chat interface, CRM panel, and layout
- `/client/src/components/ui` - Shadcn/ui component library
- `/client/src/pages` - Route-based page components (home, inventory, orders, ingredients, recipes)
- `/client/src/lib` - Utility functions, API client, and custom hooks
- `/client/src/hooks` - Reusable React hooks
- Path aliases configured for clean imports (@/, @shared/, @assets/)

### Backend Architecture

**Server Framework**
- Express.js for HTTP server with REST API endpoints
- Node.js HTTP server for potential WebSocket support
- TypeScript for type safety across the entire stack

**API Design**
- RESTful endpoints organized by resource type (contacts, messages, products, orders, ingredients, recipes)
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
- **Contacts**: Core CRM entity with name, phone, email, company, delivery addresses (array), and notes
- **Messages**: Linked to contacts with content, sender ID, status, and timestamps
- **Products**: Inventory items with bakery categories (Bombons, Macarons, Fudge, Drágeas, Pão de Mel, Torrone), price, stock quantity, and unit
- **Orders**: Customer orders with contact reference, status, order date (auto-filled), delivery date/time, delivery address, delivery fee, payment method, paid status, total, and notes
- **Order Items**: Join table linking orders to products with quantity and unit price
- **Ingredients**: Raw materials with name, unit, cost per unit, stock levels, minimum stock alerts, supplier info, and notes (displayed as "Estoque" in navigation)
- **Recipes**: Product recipes with name, yield, yield unit, instructions, notes, and automatic cost calculation. Only uses pre-registered ingredients via dropdown selection.
- **Recipe Items**: Join table linking recipes to ingredients with quantity for cost aggregation

**Access Control**
- Replit Auth for authentication
- Email whitelist via ALLOWED_EMAILS environment variable (comma-separated)
- isAllowed field in user response for authorization checks

**Type Safety**
- Drizzle-zod integration generates Zod schemas from database schema
- Insert and update schemas exclude auto-generated fields
- Shared types used across frontend and backend via `/shared/schema.ts`

**Data Relationships**
- One-to-many: Contact → Messages
- One-to-many: Contact → Orders
- Many-to-many: Orders ↔ Products (through OrderItems)
- One-to-one: Product → Recipe (optional, for products with recipes)
- Many-to-many: Recipes ↔ Ingredients (through RecipeItems)
- Cascading deletes configured where appropriate (e.g., deleting contact removes messages, deleting recipe removes recipeItems)

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

## Multi-Tenant Architecture

### Overview
The application has been refactored to support multi-tenancy (SaaS model), where each company (tenant) has completely isolated data. All business entities now include a `company_id` field, and queries are automatically filtered by the authenticated user's company.

### Key Components

**Company Entity**
- `companies` table with id, name, slug, plan, created_at
- Each user belongs to exactly one company via `users.company_id`
- Plan types: free, starter, professional, enterprise

**Data Isolation**
All business tables include `company_id`:
- contacts, messages, products, orders, order_items
- ingredients, recipes, recipe_items
- product_recipe_components, product_packaging_components

**Storage Layer Pattern**
The storage uses a factory pattern for tenant isolation:
- `IRootStorage`: Global operations (user management, company management)
- `ITenantStorage`: Company-scoped operations (all business CRUD)
- `storage.forTenant(companyId)`: Returns a tenant-scoped storage instance

**Middleware Chain**
Protected routes use three middlewares in sequence:
1. `isAuthenticated`: Validates user session and token
2. `withTenantContext`: Loads user from DB, extracts companyId into `req.tenant`
3. `tenantMiddleware`: Creates `req.tenantStorage = storage.forTenant(companyId)`

### Security Guarantees
- All business queries include automatic `company_id` filtering
- Parent entity ownership is verified before cascading operations
- Cross-company access attempts return 404 (not 403) to prevent enumeration

## Migrating to External Backend (Xano)

### Current Architecture Advantages
The storage abstraction layer (`ITenantStorage` interface) makes backend replacement straightforward:

1. **Interface Stability**: All business operations are defined in `ITenantStorage`
2. **No Direct DB Access**: Route handlers never access the database directly
3. **Validation Layer**: Zod schemas validate all inputs before storage calls

### Migration Steps to Xano

1. **Create XanoStorage Class**
```typescript
class XanoTenantStorage implements ITenantStorage {
  constructor(
    public readonly companyId: number,
    private readonly apiKey: string,
    private readonly baseUrl: string
  ) {}

  async getAllContacts(): Promise<ContactWithLastMessage[]> {
    const response = await fetch(`${this.baseUrl}/contacts?company_id=${this.companyId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  }
  // ... implement all ITenantStorage methods
}
```

2. **Create XanoRootStorage**
```typescript
class XanoRootStorage implements IRootStorage {
  forTenant(companyId: number): ITenantStorage {
    return new XanoTenantStorage(companyId, process.env.XANO_API_KEY!, process.env.XANO_BASE_URL!);
  }
  // ... implement user/company methods
}
```

3. **Swap Storage Export**
```typescript
// In storage.ts
export const storage = process.env.USE_XANO === 'true' 
  ? new XanoRootStorage() 
  : new RootStorage();
```

4. **Xano Configuration**
- Replicate all tables in Xano with same structure
- Add REST endpoints for each CRUD operation
- Configure authentication and company_id filtering in Xano
- Migrate data from PostgreSQL to Xano

### What Stays the Same
- All frontend code
- All route definitions
- All Zod validation schemas
- All types and interfaces

### What Changes
- Storage implementation (Drizzle → HTTP calls)
- Database hosting (PostgreSQL → Xano)
- Environment variables for Xano configuration

## Migration Script

Run `npx tsx server/migrate-to-multitenant.ts` to:
- Create a default company if none exists
- Assign all users without a company to the default company
- Update all existing records with null company_id to the default company