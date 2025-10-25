# Overview

This is a full-stack web application built with React frontend and Express.js backend, following a monorepo structure. The application uses modern TypeScript throughout and includes a comprehensive UI component system based on shadcn/ui with Tailwind CSS for styling. The backend is designed to use PostgreSQL with Drizzle ORM for database operations, though it currently includes a memory-based storage implementation for development purposes.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with React using Vite as the build tool and bundler. It follows a component-based architecture with:

- **UI Components**: Comprehensive shadcn/ui component library providing consistent design system
- **Routing**: Uses Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and data fetching
- **Styling**: Tailwind CSS with custom CSS variables for theming and design tokens
- **Forms**: React Hook Form with Zod validation schemas for type-safe form handling

The frontend structure separates pages, components, hooks, and utilities into distinct directories with clear separation of concerns.

## Backend Architecture

The backend follows an Express.js architecture with modular design:

- **Server Layer**: Express.js application with custom middleware for logging and error handling
- **Storage Layer**: Abstracted storage interface allowing for multiple implementations (currently memory-based, designed for database expansion)
- **Route Handling**: Centralized route registration system with API prefix structure
- **Development Tooling**: Integrated Vite development server with HMR support

## Data Storage Solutions

The application uses a dual approach for data persistence:

- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions including user management tables
- **Development Storage**: Memory-based storage implementation for rapid development and testing
- **Schema Validation**: Zod schemas for runtime type validation and data integrity

## Authentication and Authorization

The system includes foundational user management infrastructure:

- **User Schema**: Database schema supporting username/password authentication
- **Session Management**: Configured for PostgreSQL session storage with connect-pg-simple
- **Security**: Prepared for session-based authentication with secure cookie handling

## External Dependencies

- **Database**: PostgreSQL with Neon serverless database connection
- **UI Framework**: Radix UI primitives for accessible component foundations
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation
- **Development**: Replit-specific plugins for development environment integration
- **Styling**: Tailwind CSS with PostCSS for advanced styling capabilities
- **Validation**: Zod for schema validation across frontend and backend
- **Query Management**: TanStack Query for efficient data fetching and caching