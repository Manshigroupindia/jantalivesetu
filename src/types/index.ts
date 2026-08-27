// Comprehensive TypeScript Interfaces for Janta Live Setu

export type UserRole = 'director' | 'admin' | 'staff';

export type StaffApprovalStatus = 'pending_profile' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'deactivated' | 'active';

export interface LocationRecord {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  approved: boolean;
  status: StaffApprovalStatus;
  firstLoginCompleted: boolean;
  pinHash?: string;
  name?: string;
  designation?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffProfile {
  id: string;
  userId: string;
  idNumber: string; // e.g., JL-STAFF-2026-0001
  fullName: string;
  fatherName: string;
  motherName: string;
  email: string;
  contactNumber: string;
  emergencyContact: string;
  address: string;
  designation: string;
  workingArea: string;
  monthlySalary: number; // in INR (stored in whole numbers or paise)
  photoUrl: string;
  documentsUrl?: string; // merged PDF or compressed docs
  offerLetterUrl?: string;
  approvalStatus: StaffApprovalStatus;
  rejectionReason?: string;
  joinedDate: string;
  validUpto: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  deityImageUrl?: string;
  headOfficeAddress: string;
  officeLocationName: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  websiteUrl: string;
  helplineNumber: string;
  phoneNumbers: string[];
  emailAddresses: string[];
  teaUnitPrice: number;
  waterBottlePrice: number;
  electricityUnitRate: number;
  electricityPreviousReading: number;
  isSetupCompleted: boolean;
  setupCompleted?: boolean;
  setupCompletedAt?: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userDesignation: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:mm AM/PM
  checkOut?: string;
  checkInLocation: LocationRecord;
  checkOutLocation?: LocationRecord;
  totalMinutes: number;
  status: 'present' | 'absent' | 'half_day' | 'on_duty' | 'paid_leave';
  createdAt: string;
  updatedAt: string;
}

export type WorkPriority = 'low' | 'medium' | 'high' | 'urgent' | 'normal';
export type WorkStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed' | 'submitted';

export interface WorkAssignment {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  assignedToName: string;
  createdBy?: string; // userId
  createdByName?: string;
  assignedById?: string;
  assignedByName?: string;
  dueDate?: string; // YYYY-MM-DD
  deadlineDate?: string;
  deadlineTime?: string;
  priority: WorkPriority;
  textInstructions?: string;
  voiceNoteUrl?: string;
  imageUrl?: string;
  attachmentUrl?: string;
  status: WorkStatus;
  staffNotes?: string;
  staffProofUrl?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId?: string;
  channel?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderPhotoUrl?: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  voiceNoteUrl?: string;
  mediaUrl?: string;
  fileUrl?: string;
  fileName?: string;
  read?: boolean;
  timestamp?: string;
  createdAt?: string;
}

export interface ChatRoom {
  id: string;
  participants: string[]; // userIds
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCounts: Record<string, number>;
  updatedAt: string;
}

export type ExpenseCategory = 'travel' | 'office_supplies' | 'client_meeting' | 'food' | 'maintenance' | 'other' | 'Travel & Reporting' | 'Equipment & Hardware' | 'Food & Meals' | 'Office Supplies' | 'Utility & Maintenance';
export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface ExpenseItem {
  id: string;
  userId: string;
  userName: string;
  userDesignation?: string;
  amount: number; // in INR
  title: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  description?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  status: ExpenseStatus;
  paidAmount?: number;
  paidBy?: string;
  paidAt?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeaSnackLog {
  id: string;
  type?: 'tea' | 'snack';
  date: string;
  count?: number;
  itemType?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  itemDescription?: string;
  amount?: number;
  loggedById?: string;
  loggedByUserId?: string;
  loggedByUserName?: string;
  loggedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface WaterRecord {
  id: string;
  date: string;
  arrived?: boolean;
  numberOfBottles?: number;
  bottlesCount?: number;
  supplierName?: string;
  pricePerBottle?: number;
  bottlePrice?: number;
  totalCost?: number;
  receiptUrl?: string;
  receiptPhotoUrl?: string;
  loggedById?: string;
  loggedByUserId?: string;
  loggedByUserName?: string;
  loggedByName?: string;
  status?: 'unpaid' | 'paid';
  paidAt?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ElectricityRecord {
  id: string;
  date: string;
  previousReading?: number;
  currentReading?: number;
  unitsConsumed?: number;
  ratePerUnit?: number;
  unitRate?: number;
  totalAmount?: number;
  meterPhotoUrl?: string;
  notes?: string;
  isPaid?: boolean;
  loggedById?: string;
  loggedByUserId?: string;
  loggedByUserName?: string;
  loggedByName?: string;
  status?: 'pending' | 'paid';
  paidAt?: string;
  paidBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OfficeRentRecord {
  id: string;
  month: string;
  rentAmount: number;
  dueDate?: string;
  landlordName?: string;
  paymentMode?: string;
  transactionRef?: string;
  receiptUrl?: string;
  loggedById?: string;
  loggedByName?: string;
  status?: 'pending' | 'paid';
  paymentDate?: string;
  notes?: string;
  paidBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CleaningRecord {
  id: string;
  type?: 'office' | 'toilet';
  month?: string;
  date?: string;
  cleaningArea?: string;
  cleanerName: string;
  amountPaid: number;
  inspectionPhotoUrl?: string;
  loggedById?: string;
  loggedByName?: string;
  status?: 'pending' | 'paid';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalaryCalculationResult {
  userId: string;
  month: string; // YYYY-MM
  monthlyBaseSalary: number; // 30-day basis
  dailyRate: number; // baseSalary / 30
  daysInMonth: number;
  workedDays: number;
  paidSundays: number;
  paidHolidays: number;
  emergencyLeavesUsed: number;
  unpaidLeaves: number;
  deductedDays: number;
  salaryDeductionAmount: number;
  earnedSalary: number;
  expenseReimbursements: number;
  finalTotalPayable: number;

  // Aliases
  baseSalary?: number;
  totalDaysInMonth?: number;
  presentDays?: number;
  sundaysCount?: number;
  paidHolidaysCount?: number;
  emergencyLeaveCount?: number;
  absentDays?: number;
  totalPayableDays?: number;
  grossSalary?: number;
  absentDeduction?: number;
  advanceDeduction?: number;
  netSalary?: number;
}

export interface SalaryRecord {
  id: string;
  userId: string;
  userName: string;
  userDesignation?: string;
  month: string; // YYYY-MM
  baseSalary?: number;
  dailyRate?: number;
  totalMonthDays?: number;
  presentDays?: number;
  sundaysCount?: number;
  paidHolidaysCount?: number;
  emergencyLeaveCount?: number;
  absentDays?: number;
  payableDays?: number;
  grossSalary?: number;
  advanceDeduction?: number;
  netSalary?: number;
  calculation?: SalaryCalculationResult;
  status: 'draft' | 'finalized' | 'paid';
  paidSalaryAmount?: number;
  paidExpenseAmount?: number;
  totalPaid?: number;
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
  createdAt?: string;
  updatedAt: string;
}

export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notice {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  priority: NoticePriority;
  imageUrl?: string;
  attachmentUrl?: string;
  expiryDate?: string;
  isPinned: boolean;
  createdById?: string;
  createdByName: string;
  createdAt: string;
}

export interface CompanyHoliday {
  id: string;
  holidayName: string;
  date: string; // YYYY-MM-DD
  type?: 'national' | 'festival' | 'company';
  isPaid?: boolean;
  description?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  recordId?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface ClientRecord {
  id: string;
  clientName: string;
  companyName?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  gstNumber?: string;
  status?: 'active' | 'upcoming';
  notes?: string;
  createdById?: string;
  createdAt: string;
}
