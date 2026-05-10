# AI App Generator - Backend

A dynamic, config-driven backend API that powers the AI App Generator platform. This backend provides authentication, dynamic CRUD operations, team management, task management, and CSV import capabilities.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Team Lead, Member)
  - First user from each domain automatically becomes Admin
  - User role management via API

- **Dynamic CRUD API**
  - Generic `/api/:entity` endpoints for any entity
  - JSONB storage for flexible schemas
  - Automatic user-scoped data filtering
  - No hardcoded tables or schemas

- **Task Management System**
  - Complete task CRUD operations
  - Multi-user assignment with checklist dropdown
  - Task status tracking (Todo, In Progress, Done)
  - Priority levels (High, Medium, Low)
  - Due date with date picker
  - Story points for agile tracking
  - Project association for tasks

- **Project Management**
  - Create and manage projects
  - Project status tracking (Active, Completed, On Hold)
  - Projects feed into task assignment dropdown

- **Team Management**
  - Create teams
  - Add/remove team members
  - Team roles (Admin, Team Lead, Member)
  - Team-specific data access

- **CSV Import**
  - Import data to any entity via CSV
  - Automatic column mapping
  - Progress tracking
  - Error handling with partial imports

- **Notifications System**
  - Automatic notifications on CRUD operations
  - Unread count tracking
  - Mark as read functionality
  - Type-based styling (success, warning, error, info)

- **Localization Support**
  - Multi-language label support (English/Hindi)
  - Language preference stored per user

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **CSV Parsing**: csv-parser

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login user | Public |
| GET | `/auth/me` | Get current user | Authenticated |
| GET | `/auth/users` | Get all users | Admin |
| PUT | `/auth/users/:userId/role` | Update user role | Admin |
| GET | `/auth/users/list` | Get users list | Authenticated |

### Dynamic CRUD
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/:entity` | Create record | Authenticated |
| GET | `/api/:entity` | Get all records (user-scoped) | Authenticated |
| GET | `/api/:entity/:id` | Get single record | Authenticated |
| PUT | `/api/:entity/:id` | Update record | Authenticated |
| DELETE | `/api/:entity/:id` | Delete record | Authenticated |

### Apps Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/apps` | Get user's apps | Authenticated |
| GET | `/api/apps/:id` | Get specific app | Authenticated |
| POST | `/api/apps` | Create new app | Authenticated |
| PUT | `/api/apps/:id` | Update app | Authenticated |
| DELETE | `/api/apps/:id` | Delete app | Authenticated |
| POST | `/api/apps/check-name` | Check if app name exists | Authenticated |

### Tasks Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/tasks/dashboard` | Get task metrics | Authenticated |
| GET | `/api/tasks` | Get tasks (role-filtered) | Authenticated |
| POST | `/api/tasks` | Create task | Admin |
| PUT | `/api/tasks/:id` | Update task | Admin |
| PUT | `/api/tasks/:id/status` | Update task status | Assigned user/Admin |
| DELETE | `/api/tasks/:id` | Delete task | Admin |

### Projects Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/projects` | Get all projects | Authenticated |
| POST | `/api/projects` | Create project | Admin |

### Teams Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/teams` | Get user's teams | Authenticated |
| POST | `/api/teams` | Create team | Admin |
| GET | `/api/teams/:id/members` | Get team members | Authenticated |
| POST | `/api/teams/:id/members` | Add team member | Admin |

### Notifications
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/notifications` | Get notifications | Authenticated |
| GET | `/api/notifications/unread/count` | Get unread count | Authenticated |
| PUT | `/api/notifications/:id/read` | Mark as read | Authenticated |
| PUT | `/api/notifications/read-all` | Mark all as read | Authenticated |

### CSV Import
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/import/:entity` | Import CSV to entity | Authenticated |

### Utilities
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/health` | Health check | Public |

## 🔐 Role-Based Access Control

| Feature | Admin | Team Lead | Member |
|---------|-------|-----------|--------|
| Create/Edit/Delete Apps | ✅ | ✅ | ✅ |
| Create Projects | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ❌ | ❌ |
| Assign Tasks | ✅ | ❌ | ❌ |
| View All Tasks | ✅ | ❌ | ❌ |
| View Assigned Tasks | ✅ | ✅ | ✅ |
| Update Own Task Status | ✅ | ✅ | ✅ |
| Manage Teams | ✅ | ✅ | ❌ |
| Change User Roles | ✅ | ❌ | ❌ |

## 🗄️ Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP
)