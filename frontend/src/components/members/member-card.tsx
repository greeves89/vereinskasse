'use client'

import { Member } from '@/lib/types'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Mail, Phone, Edit2, Trash2 } from 'lucide-react'

interface MemberCardProps {
  member: Member
  onEdit?: (member: Member) => void
  onDelete?: (member: Member) => void
  delay?: number
}

export function MemberCard({ member, onEdit, onDelete, delay = 0 }: MemberCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {member.first_name[0]}{member.last_name[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {member.first_name} {member.last_name}
            </p>
            <span className={`text-xs ${getStatusColor(member.status)}`}>
              {getStatusLabel(member.status)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(member)}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(member)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {member.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            {member.email}
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            {member.phone}
          </div>
        )}
        {member.beitrag_monthly && (
          <p className="text-xs text-foreground font-medium">
            {formatCurrency(member.beitrag_monthly)} / Monat
          </p>
        )}
        {member.member_since && (
          <p className="text-xs text-muted-foreground">
            Mitglied seit {formatDate(member.member_since)}
          </p>
        )}
      </div>
    </motion.div>
  )
}
