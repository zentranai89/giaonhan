import { ReminderNote } from "../types";

const REMINDERS_STORAGE_KEY = "giao_nhan_reminders_v1";

// Initial sample data if user doesn't have any yet
const INITIAL_REMINDERS: ReminderNote[] = [
  {
    id: "rem_sample_1",
    title: "Hẹn khách giao trước 15:00 & kiểm đếm phiếu",
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: "14:30",
    customerName: "Đại lý Minh Phát",
    phoneNumber: "0908 123 456",
    ticketNumber: 52,
    vehicleNumber: "60C-51100",
    priority: "customer",
    status: "pending",
    notes: "Khách yêu cầu gọi điện thoại trước 30 phút khi xe tới cổng kho.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rem_sample_2",
    title: "Xác nhận đối soát ký nhận chứng từ giao tồn",
    appointmentDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    appointmentTime: "09:00",
    customerName: "Công ty Tân Á Đông",
    phoneNumber: "0912 345 678",
    ticketNumber: 78,
    vehicleNumber: "60H-03519",
    priority: "supplier",
    status: "pending",
    notes: "Lấy lại liên đỏ phiếu xuất kho có đầy đủ chữ ký thủ kho nhận hàng.",
    createdAt: new Date().toISOString(),
  },
];

export function loadReminders(): ReminderNote[] {
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) {
      // First time loading - initialize with samples
      saveReminders(INITIAL_REMINDERS);
      return INITIAL_REMINDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("Failed to load reminders from localStorage:", err);
    return [];
  }
}

export function saveReminders(reminders: ReminderNote[]): boolean {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    return true;
  } catch (err) {
    console.error("Failed to save reminders to localStorage:", err);
    return false;
  }
}

export function saveOrUpdateReminder(reminder: ReminderNote): { success: boolean; isUpdate: boolean } {
  const current = loadReminders();
  const idx = current.findIndex((r) => r.id === reminder.id);
  let updated: ReminderNote[];
  let isUpdate = false;

  if (idx >= 0) {
    isUpdate = true;
    updated = [...current];
    updated[idx] = {
      ...reminder,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updated = [
      {
        ...reminder,
        createdAt: reminder.createdAt || new Date().toISOString(),
      },
      ...current,
    ];
  }

  const ok = saveReminders(updated);
  return { success: ok, isUpdate };
}

export function deleteReminder(id: string): boolean {
  const current = loadReminders();
  const filtered = current.filter((r) => r.id !== id);
  return saveReminders(filtered);
}

export function deleteMultipleReminders(ids: string[]): boolean {
  const idSet = new Set(ids);
  const current = loadReminders();
  const filtered = current.filter((r) => !idSet.has(r.id));
  return saveReminders(filtered);
}

export function batchUpdateReminderStatus(ids: string[], status: ReminderNote["status"]): boolean {
  const idSet = new Set(ids);
  const current = loadReminders();
  const now = new Date().toISOString();
  const updated = current.map((r) => {
    if (idSet.has(r.id)) {
      return {
        ...r,
        status,
        updatedAt: now,
        completedAt: status === "completed" ? now : r.completedAt,
      };
    }
    return r;
  });
  return saveReminders(updated);
}

/**
 * Calculates reminder time categorization: "overdue" | "today" | "tomorrow" | "upcoming" | "completed"
 */
export function getReminderTimeStatus(
  appointmentDate?: string,
  appointmentTime?: string,
  isCompleted?: boolean
): {
  type: "overdue" | "today" | "tomorrow" | "upcoming" | "completed" | "no_date";
  label: string;
  badgeClass: string;
} {
  if (isCompleted) {
    return {
      type: "completed",
      label: "Hoàn thành",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }

  if (!appointmentDate || !appointmentDate.trim()) {
    return {
      type: "no_date",
      label: "Không hẹn ngày",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
    };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (appointmentDate < todayStr) {
    return {
      type: "overdue",
      label: "Quá hạn",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse",
    };
  }

  if (appointmentDate === todayStr) {
    // Check if hour passed if appointmentTime is specified
    if (appointmentTime) {
      const nowTime = new Date().toTimeString().slice(0, 5); // HH:mm
      if (appointmentTime < nowTime) {
        return {
          type: "overdue",
          label: `Quá hạn hôm nay (${appointmentTime})`,
          badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
        };
      }
    }
    return {
      type: "today",
      label: "Hôm nay",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
    };
  }

  if (appointmentDate === tomorrow) {
    return {
      type: "tomorrow",
      label: "Ngày mai",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
    };
  }

  return {
    type: "upcoming",
    label: "Sắp tới",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
}
