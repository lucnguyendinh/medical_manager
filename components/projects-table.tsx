"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, LayoutDashboard, Stethoscope, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/submit-button";

type ProjectStatus = "VISIBLE" | "HIDDEN";

type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  description: string;
};

type ProjectsTableProps = {
  projects: ProjectRow[];
  isAdmin: boolean;
  projectStatuses: readonly ProjectStatus[];
  createProjectAction: (formData: FormData) => Promise<void>;
  updateProjectAction: (formData: FormData) => Promise<void>;
  deleteProjectAction: (formData: FormData) => Promise<void>;
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "VISIBLE") {
    return (
      <Badge variant="success" className="gap-1">
        <Eye size={11} />
        Hiển thị
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <EyeOff size={11} />
      Ẩn
    </Badge>
  );
}

export function ProjectsTable({
  projects,
  isAdmin,
  projectStatuses,
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
}: ProjectsTableProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);

  return (
    <>
      <section className="mm-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="mm-section-title">Danh sách dự án</h2>
            <p className="mm-section-desc">
              {isAdmin ? "Quản lý tất cả dự án và công ty liên quan." : "Các dự án được gán cho tài khoản của bạn."}
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mm-btn-primary"
            >
              <Plus size={15} />
              Tạo dự án
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Tên dự án</th>
                <th>Trạng thái</th>
                <th>Mô tả</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-zinc-400">
                    Chưa có dự án nào.
                  </td>
                </tr>
              ) : null}
              {projects.map((project) => (
                <tr key={project.id} className="align-middle">
                  <td className="font-semibold text-zinc-900">{project.name}</td>
                  <td>
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="max-w-xs text-zinc-500">{project.description || "Chưa có mô tả."}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
                        href={`/projects/${encodeURIComponent(project.name)}/dashboard`}
                      >
                        <LayoutDashboard size={12} />
                        Dashboard
                      </Link>
                      <Link
                        className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
                        href={`/projects/${encodeURIComponent(project.name)}/medical`}
                      >
                        <Stethoscope size={12} />
                        Vật tư
                      </Link>
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingProject(project)}
                            className="mm-btn-ghost mm-btn-sm flex items-center gap-1"
                          >
                            <Pencil size={12} />
                            Sửa
                          </button>
                          <form action={deleteProjectAction} className="contents">
                            <input type="hidden" name="projectId" value={project.id} />
                            <SubmitButton
                              label="Xóa"
                              pendingLabel="..."
                              className="mm-btn-danger mm-btn-sm"
                            />
                          </form>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create modal */}
      {isAdmin && isCreateOpen ? (
        <Modal title="Tạo dự án mới" onClose={() => setCreateOpen(false)}>
          <form action={createProjectAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Tên dự án" required>
                <input
                  name="name"
                  required
                  placeholder="Nhập tên dự án"
                  className="mm-input"
                />
              </FormField>
              <FormField label="Trạng thái">
                <select name="status" defaultValue="VISIBLE" className="mm-input">
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "VISIBLE" ? "Hiển thị" : "Ẩn"}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label="Mô tả">
              <input
                name="description"
                placeholder="Mô tả ngắn về dự án (tùy chọn)"
                className="mm-input"
              />
            </FormField>
            <div className="flex justify-end">
              <SubmitButton label="Tạo dự án" pendingLabel="Đang tạo..." />
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Edit modal */}
      {isAdmin && editingProject ? (
        <Modal title="Chỉnh sửa dự án" onClose={() => setEditingProject(null)}>
          <form action={updateProjectAction} className="space-y-4">
            <input type="hidden" name="projectId" value={editingProject.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Tên dự án">
                <input value={editingProject.name} disabled className="mm-input-readonly" />
              </FormField>
              <FormField label="Trạng thái">
                <select
                  name="status"
                  defaultValue={editingProject.status}
                  className="mm-input"
                >
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "VISIBLE" ? "Hiển thị" : "Ẩn"}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label="Mô tả">
              <input
                name="description"
                defaultValue={editingProject.description}
                placeholder="Mô tả dự án"
                className="mm-input"
              />
            </FormField>
            <div className="flex justify-end">
              <SubmitButton label="Lưu thay đổi" pendingLabel="Đang lưu..." />
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
