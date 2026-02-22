export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'member'
  organization_name: string | null
  subscription_tier: 'free' | 'premium'
  subscription_expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Member {
  id: number
  user_id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  member_since: string | null
  member_number: string | null
  status: 'active' | 'inactive' | 'suspended'
  beitrag_monthly: string | null
  iban: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  user_id: number
  member_id: number | null
  category_id: number | null
  type: 'income' | 'expense'
  amount: string
  description: string
  category: string | null
  transaction_date: string
  receipt_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  user_id: number
  name: string
  type: 'income' | 'expense'
  color: string
  created_at: string
}

export interface TransactionStats {
  total_income: string
  total_expense: string
  balance: string
  month_income: string
  month_expense: string
  transaction_count: number
}

export interface Feedback {
  id: number
  user_id: number
  type: 'bug' | 'feature' | 'general'
  title: string
  message: string
  status: 'pending' | 'approved' | 'rejected' | 'in_review'
  admin_response: string | null
  created_at: string
  updated_at: string
}

export interface MemberStats {
  total: number
  active: number
  limit: number | null
  is_premium: boolean
}

export interface PaymentReminder {
  id: number
  member_id: number
  amount: string
  due_date: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'paid' | 'overdue'
  notes: string | null
  created_at: string
}

export interface MemberPaymentOverview {
  member_id: number
  member_name: string
  email: string | null
  beitrag_monthly: number | null
  open_reminders: number
  overdue_count: number
  total_due: number
}

export interface AdminStats {
  total_users: number
  premium_users: number
  total_members: number
  total_transactions: number
  pending_feedback: number
}
