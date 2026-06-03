"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Plus,
  Users,
  Pencil,
  ShieldCheck,
  User,
  CheckCircle2,
  XCircle,
  Lock,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { CsvImportCard } from "@/components/ui/csv-import-card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { SubmitButton } from "@/components/submit-button";

type ProjectCompanyOption = {
  project: string;
  name: string;
};

type Assignment = {
  project: string;
  company: string;
};

type UserRow = {
  id: string;
  gmail: string;
  assignments: Assignment[];
  isAdmin: boolean;
  isActive: boolean;
  isProtected: boolean;
};

export type UserListQueryState = {
  q: string;
  role: "" | "admin" | "user";
  status: "" | "active" | "inactive";
  page: number;
  totalPages: number;
  totalCount: number;
};

function buildUserListHref(
  basePath: string,
  params: { q: string; role: string; status: string; page: number },
) {
  const sp = new URLSearchParams();
  if (params.q.trim()) sp.set("q", params.q.trim());
  if (params.role) sp.set("role", params.role);
  if (params.status) sp.set("status", params.status);
  if (params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

type UsersTableProps = {
  users: UserRow[];
  userListQuery: UserListQueryState;
  basePath?: string;
  projects: string[];
  projectCompanies: ProjectCompanyOption[];
  currentAdminId: string;
  createUserAction: (formData: FormData) => Promise<void>;
  updateUserAction: (formData: FormData) => Promise<void>;
  toggleUserActiveAction: (formData: FormData) => Promise<void>;
  deleteUserAction: (formData: FormData) => Promise<void>;
  importUsersCsvAction: (formData: FormData) => Promise<void>;
};

export function UsersTable({
  users,
  userListQuery,
  basePath = "/admin/users",
  projects,
  projectCompanies,
  currentAdminId,
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  deleteUserAction,
  importUsersCsvAction,
}: UsersTableProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editAssignments, setEditAssignments] = useState<Assignment[]>([]);
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  const companiesByProject = useMemo(() => {
    const nextMap = new Map<string, string[]>();
    for (const row of projectCompanies) {
      const list = nextMap.get(row.project) ?? [];
      if (!list.includes(row.name)) {
        list.push(row.name);
      }
      nextMap.set(row.project, list);
    }
    for (const [project, list] of nextMap.entries()) {
      list.sort((a, b) => a.localeCompare(b));
      nextMap.set(project, list);
    }
    return nextMap;
  }, [projectCompanies]);

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setEditIsAdmin(user.isAdmin);
    setEditAssignments(user.assignments);
  }

  function addAssignment() {
    setEditAssignments((prev) => [...prev, { project: projects[0] ?? "", company: "" }]);
  }

  function removeAssignment(index: number) {
    setEditAssignments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAssignment(index: number, field: keyof Assignment, value: string) {
    setEditAssignments((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (field === "project") return { project: value, company: "" };
        return { ...a, company: value };
      }),
    );
  }

  return (
    <>
      {/* CSV Import section */}
        <div className="grid gap-4 sm:grid-cols-1 md:max-w-sm">
          <CsvImportCard
            icon={<Users size={16} />}
            title="Nhập người dùng"
            action={importUsersCsvAction}
            submitLabel="Nhập Users"
          />
        </div>

      {/* Users table */}
      <section className="mm-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="mm-section-title">Người dùng</h2>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mm-btn-primary mm-btn-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            Tạo người dùng
          </button>
        </div>
        <form
          method="get"
          action={basePath}
          className="flex flex-wrap items-end gap-2 border-b border-zinc-100 bg-zinc-50/80 px-5 py-3"
        >
          <div className="min-w-[180px] flex-1">
            <label htmlFor="admin-users-q" className="mb-1 block text-xs font-medium text-zinc-600">
              Tìm Gmail
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                size={14}
              />
              <input
                id="admin-users-q"
                name="q"
                type="search"
                defaultValue={userListQuery.q}
                placeholder="vd: name@gmail.com"
                className="mm-input w-full pl-8"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="w-full min-w-[140px] sm:w-44">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Vai trò</span>
            <SearchableSelect
              name="role"
              defaultValue={userListQuery.role}
              placeholder="Tất cả"
              className="mm-input"
              searchPlaceholder="Tìm..."
              options={[
                { value: "", label: "Tất cả vai trò" },
                { value: "admin", label: "Admin" },
                { value: "user", label: "User" },
              ]}
            />
          </div>
          <div className="w-full min-w-[140px] sm:w-44">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Trạng thái</span>
            <SearchableSelect
              name="status"
              defaultValue={userListQuery.status}
              placeholder="Tất cả"
              className="mm-input"
              searchPlaceholder="Tìm..."
              options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "active", label: "Hoạt động" },
                { value: "inactive", label: "Tắt" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2 pb-0.5">
            <button type="submit" className="mm-btn-primary mm-btn-sm flex items-center gap-1.5">
              <Search size={13} />
              Lọc
            </button>
            <Link href={basePath} className="mm-btn-ghost mm-btn-sm inline-flex items-center justify-center">
              Đặt lại
            </Link>
          </div>
        </form>
        {/* Mobile: stacked cards (below md) */}
        <div className="space-y-3 p-4 md:hidden">
          {users.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Không có người dùng phù hợp bộ lọc.
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{user.gmail}</p>
                    {user.isProtected ? (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                        <Lock size={10} />
                        Super admin được bảo vệ
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {user.isAdmin ? (
                      <Badge variant="medical" className="gap-1">
                        <ShieldCheck size={11} />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="gap-1">
                        <User size={11} />
                        User
                      </Badge>
                    )}
                    {user.isActive ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 size={11} />
                        Hoạt động
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="gap-1">
                        <XCircle size={11} />
                        Tắt
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
                    Phân quyền dự án / công ty
                  </p>
                  {user.isAdmin ? (
                    <span className="text-xs text-zinc-400">Tất cả dự án</span>
                  ) : user.assignments.length === 0 ? (
                    <span className="text-xs text-zinc-400">—</span>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.assignments.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                        >
                          {a.project} / {a.company}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    disabled={user.isProtected}
                    className="mm-btn-ghost mm-btn-sm flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil size={12} />
                    Sửa
                  </button>
                  <form action={toggleUserActiveAction} className="contents">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="nextActive" value={user.isActive ? "false" : "true"} />
                    <SubmitButton
                      label={user.isActive ? "Tắt" : "Bật"}
                      pendingLabel="..."
                      className="mm-btn-secondary mm-btn-sm"
                    />
                  </form>
                  {user.id !== currentAdminId && !user.isProtected ? (
                    <form action={deleteUserAction} className="contents">
                      <input type="hidden" name="userId" value={user.id} />
                      <SubmitButton label="Xóa" pendingLabel="..." className="mm-btn-danger mm-btn-sm" />
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: full table (md and up) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Gmail</th>
                <th>Vai trò</th>
                <th>Phân quyền dự án / công ty</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-zinc-500">
                    Không có người dùng phù hợp bộ lọc.
                  </td>
                </tr>
              ) : null}
              {users.map((user) => (
                <tr key={user.id} className="align-middle">
                  <td>
                    <div className="font-medium text-zinc-900">{user.gmail}</div>
                    {user.isProtected ? (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                        <Lock size={10} />
                        Super admin được bảo vệ
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {user.isAdmin ? (
                      <Badge variant="medical" className="gap-1">
                        <ShieldCheck size={11} />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="gap-1">
                        <User size={11} />
                        User
                      </Badge>
                    )}
                  </td>
                  <td>
                    {user.isAdmin ? (
                      <span className="text-xs text-zinc-400">Tất cả dự án</span>
                    ) : user.assignments.length === 0 ? (
                      <span className="text-xs text-zinc-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.assignments.map((a, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                          >
                            {a.project} / {a.company}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {user.isActive ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 size={11} />
                        Hoạt động
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="gap-1">
                        <XCircle size={11} />
                        Tắt
                      </Badge>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        disabled={user.isProtected}
                        className="mm-btn-ghost mm-btn-sm flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={12} />
                        Sửa
                      </button>
                      <form action={toggleUserActiveAction} className="contents">
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="nextActive"
                          value={user.isActive ? "false" : "true"}
                        />
                        <SubmitButton
                          label={user.isActive ? "Tắt" : "Bật"}
                          pendingLabel="..."
                          className="mm-btn-secondary mm-btn-sm"
                        />
                      </form>
                      {user.id !== currentAdminId && !user.isProtected ? (
                        <form action={deleteUserAction} className="contents">
                          <input type="hidden" name="userId" value={user.id} />
                          <SubmitButton
                            label="Xóa"
                            pendingLabel="..."
                            className="mm-btn-danger mm-btn-sm"
                          />
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mm-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-400">
            Trang{" "}
            <span className="font-semibold text-zinc-700">{userListQuery.page}</span>
            {" "}/{" "}
            <span className="font-semibold text-zinc-700">{userListQuery.totalPages}</span>
            {" — "}
            <span className="font-semibold text-zinc-700">{userListQuery.totalCount}</span>
            {" "}bản ghi
          </span>
          <div className="flex items-center gap-1">
            <Link
              className={`mm-btn-secondary mm-btn-sm inline-flex items-center gap-1 ${
                userListQuery.page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
              href={buildUserListHref(basePath, {
                q: userListQuery.q,
                role: userListQuery.role,
                status: userListQuery.status,
                page: Math.max(1, userListQuery.page - 1),
              })}
            >
              <ChevronLeft size={13} />
              Trước
            </Link>
            <Link
              className={`mm-btn-secondary mm-btn-sm inline-flex items-center gap-1 ${
                userListQuery.page >= userListQuery.totalPages ? "pointer-events-none opacity-40" : ""
              }`}
              href={buildUserListHref(basePath, {
                q: userListQuery.q,
                role: userListQuery.role,
                status: userListQuery.status,
                page: Math.min(userListQuery.totalPages, userListQuery.page + 1),
              })}
            >
              Sau
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* Available projects (admin overview) */}
      <section className="mm-card p-5">
        <h2 className="mm-section-title mb-3">Danh sách dự án hiện có</h2>
        <div className="flex flex-wrap gap-2">
          {projects.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có dự án nào.</p>
          ) : null}
          {projects.map((projectName) => (
            <span
              key={projectName}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-xs"
            >
              {projectName}
            </span>
          ))}
        </div>
      </section>

      {/* Create user modal */}
      {isCreateOpen ? (
        <Modal title="Tạo người dùng mới" onClose={() => setCreateOpen(false)}>
          <CreateUserForm
            action={createUserAction}
            projects={projects}
            projectCompanies={projectCompanies}
          />
        </Modal>
      ) : null}

      {/* Edit user modal */}
      {editingUser ? (
        <Modal title="Chỉnh sửa người dùng" onClose={() => setEditingUser(null)}>
          <form action={updateUserAction} className="space-y-4">
            <input type="hidden" name="userId" value={editingUser.id} />
            <input
              type="hidden"
              name="assignments_count"
              value={editIsAdmin ? 0 : editAssignments.length}
            />
            {/* Hidden fields for each assignment */}
            {!editIsAdmin &&
              editAssignments.map((a, i) => (
                <span key={i}>
                  <input type="hidden" name={`assignment_project_${i}`} value={a.project} />
                  <input type="hidden" name={`assignment_company_${i}`} value={a.company} />
                </span>
              ))}

            <FormField label="Gmail">
              <input value={editingUser.gmail} disabled className="mm-input-readonly" />
            </FormField>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50">
              <input
                type="checkbox"
                name="isAdmin"
                checked={editIsAdmin}
                onChange={(e) => setEditIsAdmin(e.target.checked)}
                disabled={editingUser.isProtected}
                className="h-4 w-4 cursor-pointer rounded accent-emerald-600"
              />
              <div>
                <span className="text-sm font-medium text-zinc-700">Quyền Admin</span>
                <p className="text-xs text-zinc-500">Có thể quản lý tất cả dự án và người dùng.</p>
              </div>
            </label>

            {!editIsAdmin ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-600">Phân quyền dự án / công ty</p>

                {editAssignments.map((a, i) => {
                  const availableCompanies = companiesByProject.get(a.project) ?? [];
                  return (
                    <div
                      key={i}
                      className="flex items-end gap-2 rounded-lg border border-zinc-200 p-3"
                    >
                      <FormField label="Dự án" className="flex-1">
                        <SearchableSelect
                          value={a.project}
                          onValueChange={(nextValue) => updateAssignment(i, "project", nextValue)}
                          placeholder="— Chọn dự án —"
                          className="mm-input"
                          options={[
                            { value: "", label: "— Chọn dự án —" },
                            ...projects.map((project) => ({ value: project })),
                          ]}
                        />
                      </FormField>
                      <FormField label="Công ty" className="flex-1">
                        <SearchableSelect
                          value={a.company}
                          disabled={!a.project}
                          onValueChange={(nextValue) => updateAssignment(i, "company", nextValue)}
                          placeholder="— Chọn công ty —"
                          className="mm-input disabled:bg-zinc-50 disabled:text-zinc-400"
                          options={[
                            { value: "", label: "— Chọn công ty —" },
                            ...availableCompanies.map((company) => ({ value: company })),
                          ]}
                        />
                      </FormField>
                      <button
                        type="button"
                        onClick={() => removeAssignment(i)}
                        className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:border-red-300 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addAssignment}
                  className="mm-btn-ghost mm-btn-sm flex w-full cursor-pointer items-center justify-center gap-1 border border-dashed border-zinc-300"
                >
                  <Plus size={13} />
                  Thêm phân quyền
                </button>
              </div>
            ) : null}

            <div className="flex justify-end">
              <SubmitButton label="Lưu thay đổi" pendingLabel="Đang lưu..." />
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
