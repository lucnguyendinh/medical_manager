"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/submit-button";

type ProjectCreateCompanyModalProps = {
  action: (formData: FormData) => Promise<void>;
};

export function ProjectCreateCompanyModal({ action }: ProjectCreateCompanyModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mm-btn-secondary inline-flex items-center gap-1.5"
      >
        <Plus size={14} />
        Thêm công ty mới
      </button>

      {isOpen ? (
        <Modal title="Thêm công ty mới" onClose={() => setIsOpen(false)} maxWidth="max-w-3xl">
          <form action={action} className="grid gap-3 md:grid-cols-3">
            <FormField label="Tên công ty" required>
              <input name="name" required placeholder="Tên công ty" className="mm-input" />
            </FormField>
            <FormField label="Số điện thoại">
              <input name="phone_number" placeholder="0x xxx xxx xxx" className="mm-input" />
            </FormField>
            <FormField label="Mã số thuế">
              <input name="tax_number" placeholder="MST" className="mm-input" />
            </FormField>
            <FormField label="Địa chỉ" className="md:col-span-2">
              <input name="address" placeholder="Địa chỉ đầy đủ" className="mm-input" />
            </FormField>
            <FormField label="Số tài khoản ngân hàng">
              <input name="bank_account_number" placeholder="Số tài khoản" className="mm-input" />
            </FormField>
            <FormField label="Ngân hàng" className="md:col-span-3">
              <input name="bank_name" placeholder="Tên ngân hàng" className="mm-input" />
            </FormField>
            <div className="flex justify-end md:col-span-3">
              <SubmitButton label="Thêm công ty" pendingLabel="Đang thêm..." />
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
