"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { FormField } from "@/components/ui/form-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SubmitButton } from "@/components/submit-button";

type Assignment = {
  project: string;
  company: string;
};

type CreateUserFormProps = {
  action: (formData: FormData) => Promise<void>;
  projects: string[];
  projectCompanies: Array<{
    project: string;
    name: string;
  }>;
};

export function CreateUserForm({ action, projects, projectCompanies }: CreateUserFormProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([
    { project: projects[0] ?? "", company: "" },
  ]);

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

  function addAssignment() {
    setAssignments((prev) => [...prev, { project: projects[0] ?? "", company: "" }]);
  }

  function removeAssignment(index: number) {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAssignment(index: number, field: keyof Assignment, value: string) {
    setAssignments((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (field === "project") return { project: value, company: "" };
        return { ...a, company: value };
      }),
    );
  }

  return (
    <form action={action} className="space-y-4">
      {/* Hidden assignments fields */}
      <input type="hidden" name="assignments_count" value={isAdmin ? 0 : assignments.length} />
      {!isAdmin &&
        assignments.map((a, i) => (
          <span key={i}>
            <input type="hidden" name={`assignment_project_${i}`} value={a.project} />
            <input type="hidden" name={`assignment_company_${i}`} value={a.company} />
          </span>
        ))}

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Gmail" required>
          <input
            name="gmail"
            type="email"
            required
            placeholder="name@gmail.com"
            className="mm-input"
          />
        </FormField>
        <FormField label="Mật khẩu" required>
          <input
            name="password"
            type="password"
            required
            placeholder="Mật khẩu mạnh"
            className="mm-input"
          />
        </FormField>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50">
        <input
          type="checkbox"
          name="isAdmin"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded accent-emerald-600"
        />
        <div>
          <span className="text-sm font-medium text-zinc-700">Quyền Admin</span>
          <p className="text-xs text-zinc-500">Có thể quản lý tất cả dự án và người dùng.</p>
        </div>
      </label>

      {!isAdmin ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-600">Phân quyền dự án / công ty</p>

          {assignments.map((a, i) => {
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
                {assignments.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeAssignment(i)}
                    className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:border-red-300 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                ) : null}
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
        <SubmitButton label="Tạo người dùng" pendingLabel="Đang tạo..." />
      </div>
    </form>
  );
}
