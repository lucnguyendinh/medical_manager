"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Upload,
  Users,
  Pencil,
  ShieldCheck,
  User,
  CheckCircle2,
  XCircle,
  Lock,
  X,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { CsvImportCard } from "@/components/ui/csv-import-card";
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

type UsersTableProps = {
  users: UserRow[];
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
      <section className="mm-card p-5">
        <div className="mb-4">
          <h2 className="mm-section-title flex items-center gap-2">
            <Upload size={16} className="text-sky-600" />
            Nhập dữ liệu CSV
          </h2>
          <p className="mm-section-desc mt-1">
            Chế độ nghiêm ngặt: nếu phát hiện bất kỳ dòng trùng lặp hoặc không hợp lệ, toàn bộ
            lần nhập sẽ bị hủy.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-1 md:max-w-sm">
          <CsvImportCard
            icon={<Users size={16} />}
            title="Nhập người dùng"
            hint="Cột bắt buộc: gmail, password, isadmin, project, company"
            action={importUsersCsvAction}
            submitLabel="Nhập Users"
          />
        </div>
      </section>

      {/* Users table */}
      <section className="mm-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="mm-section-title">Người dùng</h2>
            <p className="mm-section-desc">{users.length} tài khoản trong hệ thống.</p>
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
        <div className="overflow-x-auto">
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
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700"
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
                className="h-4 w-4 cursor-pointer rounded accent-sky-600"
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
                        <select
                          value={a.project}
                          onChange={(e) => updateAssignment(i, "project", e.target.value)}
                          className="mm-input"
                        >
                          <option value="">— Chọn dự án —</option>
                          {projects.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Công ty" className="flex-1">
                        <select
                          value={a.company}
                          disabled={!a.project}
                          onChange={(e) => updateAssignment(i, "company", e.target.value)}
                          className="mm-input disabled:bg-zinc-50 disabled:text-zinc-400"
                        >
                          <option value="">— Chọn công ty —</option>
                          {availableCompanies.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
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
