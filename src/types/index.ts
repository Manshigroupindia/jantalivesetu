export type UserRole = 'SUPER_ADMIN' | 'MANAGE' | 'VIEW';

export interface EntityPermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface CustomPermissions {
  websites: EntityPermissions;
  gmail: EntityPermissions;
  hosting: EntityPermissions;
  social: EntityPermissions;
  categories: EntityPermissions;
  employees: EntityPermissions;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  employeeId?: string;
  phone?: string;
  photoURL?: string;
  profileImage?: string;
  department?: string;
  status: 'Active' | 'Inactive';
  permissions?: CustomPermissions;
  accessPinHash?: string;
  accessPinEnabled?: boolean;
  accessPinUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  department: string;
  notes?: string;
  profileImage?: string;
  permissions: CustomPermissions;
  accessPinHash?: string;
  accessPinEnabled?: boolean;
  accessPinUpdatedAt?: string;
  uid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteClientData {
  id: string;
  srNo: number;
  clientName: string;
  websiteName: string;
  categoryId: string;
  categoryName?: string;
  domain: string;
  domainPurchaseDate: string; // YYYY-MM-DD
  domainExpiryDate: string;   // YYYY-MM-DD
  domainBuyPlatform: string;  // e.g. Domain India, GoDaddy, Namecheap, etc.
  domainBuyCard: string;      // ONLY last 4 digits, e.g. "**** 4821"
  hostingApp: string;
  phoneNumber: string;
  emailId: string;
  contactPersonName: string;
  websiteStatus: 'Complete' | 'Uncomplete';
  websiteLink: string;
  websiteAdminUserId: string;
  websiteAdminPassword: string;
  paymentMethod: 'Cash' | 'Online' | 'RTGS' | 'NEFT' | 'UPI';
  paymentStatus: 'Paid' | 'Pending';
  active: 'Active' | 'Inactive';
  renewDate: string;
  feedback: string;
  hostingId: string;
  hostingPassword: string;
  logoUrl?: string;
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export interface GmailAccount {
  id: string;
  accountName: string;
  gmailAddress: string;
  password: string;
  recoveryEmail: string;
  recoveryPhone: string;
  purpose: string;
  ownerClient: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PlatformAccount {
  id: string;
  platformName: string;
  platformType: string;
  loginId: string;
  password: string;
  panelUrl: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SocialAccount {
  id: string;
  platform: 'Facebook' | 'Instagram' | 'YouTube' | 'LinkedIn' | 'X' | 'Pinterest' | 'Telegram' | 'WhatsApp Business' | 'Other';
  accountName: string;
  usernameEmail: string;
  password: string;
  profileUrl: string;
  phone?: string;
  ownerClient: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW_SENSITIVE_DATA'
  | 'REVEAL_PASSWORD'
  | 'ROLE_CHANGE'
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_DELETED'
  | 'ACCESS_PIN_CREATED'
  | 'ACCESS_PIN_CHANGED'
  | 'ACCESS_PIN_RESET'
  | 'ACCESS_PIN_DISABLED'
  | 'ACCESS_PIN_VERIFICATION_FAILED'
  | 'ACCESS_PIN_VERIFICATION_SUCCESS'
  | 'DELETE_VERIFIED';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: AuditAction;
  collection: string;
  recordId: string;
  details?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemSettings {
  companyName: string;
  companyLogo?: string;
  defaultPaginationSize: number;
  accessPasswordHash: string;
  securityNotice?: string;
  updatedAt?: string;
}

export interface DomainExpiryFilter {
  purchaseMonth?: number;
  purchaseYear?: number;
  expiryMonth?: number;
  expiryYear?: number;
}
