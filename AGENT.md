# Context & Goal
You are an expert Full-stack Developer specializing in Next.js 14+ (App Router), MongoDB, Mongoose, NextAuth.js, Tailwind CSS, and Shadcn UI. 
Your task is to build a full-stack Web Application for managing Medical Supplies (Vật tư y tế) based on specific role-based access controls. Write clean, modular, and maintainable code.

# Tech Stack
- Frontend: Next.js (App Router), React, Tailwind CSS, Shadcn UI (for rapid, clean UI components).
- Backend: Next.js Route Handlers (API Routes) & Server Actions.
- Database: MongoDB with Mongoose ORM.
- Authentication: NextAuth.js (Credentials provider for email/password).

# Database Schemas & Entities
Use Mongoose to define the following schemas. 

1. User
- gmail: String (Required, Unique)
- password: String (Required, securely hashed using bcrypt)
- company: String (Optional, references Company name)
- project: Array of Strings (Optional, references Project names)
- is_active: Boolean (Default: true)
- isAdmin: Boolean (Default: false)
* Note: Admin has `company` and `project` as undefined/null.

2. Company
- name: String (Required, Unique - acts as primary key)
- phone_number: String (Optional)
- tax_number: String (Optional)
- address: String (Optional)
- bank_account_number: String (Optional)
- bank_name: String (Optional)

3. Project
- name: String (Required, Unique - acts as primary key)
- status: String (Enum: ['VISIBLE', 'HIDDEN'], required, managed by Admin)
- description: String (Optional)

4. Medical (Vật tư y tế)
- id: String (or use default MongoDB _id)
- ma_nhom: String
- ma_vtyt_bv: String
- ten_vtyt_bv: String
- quy_cach: String
- don_vi_tinh: String
- ma_hieu: String
- hang_sx: String
- nuoc_sx: String
- don_gia: String
- company: String (References Company name)
- project: String (References Project name)
- dinh_muc: String
- so_luong: String
- is_delete: Boolean (Default: false, for soft delete)

# Business Logic & Authorization Rules
CRITICAL RULES:
1. Authentication: NO public registration. ONLY Admin can create/register new User accounts. 
2. Role-Based Access Control (RBAC):
   - ADMIN: Can access all pages. Can create users, assign `company` and `project` to users. Has full CRUD over all `Medical` records across all companies and projects.
   - USER: Can only login (if is_active is true). Cannot access User Management or global settings.
3. Medical Data Permissions:
   - ADMIN: View, Add, Edit, Delete ALL Medical records.
   - USER: View, Edit, Delete ONLY Medical records where `Medical.company` == `User.company` AND `Medical.project` is in `User.project` array.
4. Data Mutation Rules: Users/Admins can edit any field in the database EXCEPT the `name` field for Company and Project (which acts as the immutable primary key). In Edit Forms, the `name` field must be disabled.

# Page Routes & UI Structure
Implement the following routes:
1. `/login`: Authentication page.
2. `/admin/users`: (Admin only) List users, Add new user (with company/project assignment), Edit user, Delete/Deactivate user.
3. `/projects`: List of projects. Admin can Add/Edit/Delete. Users see projects they are assigned to.
4. `/projects/[projectName]/dashboard`: Dashboard specific to a project.
5. `/medical`: List of medical supplies. Include a Data Table with search, filter, and pagination. Forms to Add/Edit/Delete based on the RBAC rules defined above.

# Execution Plan (Step-by-Step)
Please implement the project in the following order. Wait for my confirmation after each step before proceeding to the next.

**Step 1: Setup & Configuration**
Initialize Next.js app, configure MongoDB connection (mongoose), setup NextAuth.js credentials provider, and configure Shadcn UI. Create the Mongoose Models.

**Step 2: Auth & Middleware**
Implement the Login page, NextAuth configuration, and Next.js Middleware to protect routes based on `isAdmin` and authentication status.

**Step 3: Admin Management Pages**
Implement `/admin/users` and `/projects` with Server Actions for CRUD operations. Ensure the primary key rule (`name` is immutable) is enforced in UI and Backend.

**Step 4: Medical Management (The Core)**
Implement the `/medical` page with a complex data table. Implement the strict RBAC rules for API queries so Users only see and modify their allowed data.

**Step 5: Dashboard & Polish**
Implement `/projects/[projectName]/dashboard` with basic mock statistics. Polish the UI/UX with loading states, toast notifications for success/errors, and error handling.

Start with Step 1. Present the code for database connection, NextAuth setup, and Mongoose models.