# Janta Live Setu — Central Salary Engine Architecture & Specification

## 1. Daily Base Rate Formula
All salary calculations in **Janta Live Setu** are performed on a standardized 30-day basis:

$$\text{Daily Base Rate} = \frac{\text{Monthly Base Salary}}{30}$$

### Example
For an employee with a configured monthly salary of **₹12,000**:
$$\text{Daily Base Rate} = \frac{12000}{30} = \text{₹400 / day}$$

---

## 2. 30-Day Month Basis & Sunday Rule
- **Standard Salary Basis**: Base salary calculations cap total payable days at **30 days**.
- **Sundays**: Sundays are paid company holidays.
  - In a 31-day month with 5 Sundays (or months with extra holidays), full attendance + Sundays will not exceed the 30-day base salary limit (e.g., maximum ₹12,000 for ₹12,000 base).
  - The fifth Sunday does not overpay salary beyond the configured monthly salary.

---

## 3. Paid Company Holidays
- Holidays listed in the **Company Holiday Calendar** are treated as paid days.
- If a configured holiday falls on a Sunday, it is merged so that it is not double-counted.

---

## 4. Emergency Leave & Deductions
- **Emergency Leave**: Each staff member is entitled to **1 paid emergency leave** per month (0 salary deduction).
- **Unpaid Leaves**: Any additional unexcused absences or unpaid leave days beyond the allowed paid leave deduct `Daily Base Rate` per day:
$$\text{Deduction Amount} = \text{Deducted Days} \times \text{Daily Base Rate}$$
$$\text{Earned Base Salary} = \max(0, \text{Monthly Base Salary} - \text{Deduction Amount})$$

---

## 5. Expense Reimbursements & Net Payable
- Approved field/reporting expense reimbursements are added separately to the net salary:
$$\text{Net Total Payable} = \text{Earned Base Salary} - \text{Advance Deductions} + \text{Approved Expense Reimbursements}$$

---

## 6. Realtime Firestore & PIN Finalization
- Directors must authorize payroll finalization using their **4-digit Security PIN**.
- Every finalized salary record is logged into the **Executive Audit Trail** (`auditLogs`).
