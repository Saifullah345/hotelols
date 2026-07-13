'use client'

import { motion } from 'framer-motion'
import { Building2, Users, CreditCard, BarChart3, Shield, Zap } from 'lucide-react'

const features = [
  { icon: Building2,  title: 'Room Management',    desc: 'Live room status, housekeeping queues, and maintenance requests — all from one screen.',                         ring: 'bg-blue-500/10 text-blue-400'     },
  { icon: Users,      title: 'Staff & Roles',       desc: 'Role-based access for admins, front desk, and housekeeping. Everyone sees only what they need.',                 ring: 'bg-violet-500/10 text-violet-400' },
  { icon: CreditCard, title: 'Payments',            desc: 'Online and walk-in payments via Stripe with automatic reconciliation and daily reports.',                        ring: 'bg-emerald-500/10 text-emerald-400'},
  { icon: BarChart3,  title: 'Revenue Analytics',   desc: 'ADR, RevPAR, and occupancy trends. Spot problems and opportunities before they hit the bottom line.',            ring: 'bg-amber-500/10 text-amber-400'   },
  { icon: Shield,     title: 'Enterprise Security', desc: 'Row-level tenant isolation on every query. Your data stays yours — no cross-hotel leakage ever.',               ring: 'bg-rose-500/10 text-rose-400'     },
  { icon: Zap,        title: 'Real-Time Updates',   desc: 'New bookings, check-ins, and task assignments appear instantly across every device on your team.',               ring: 'bg-cyan-500/10 text-cyan-400'     },
]

const EASE = [0.22, 1, 0.36, 1] as const

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map(({ icon: Icon, title, desc, ring }, i) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
          className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-100 hover:-translate-y-1.5 transition-[box-shadow,transform] duration-300 cursor-default"
        >
          <div className={`w-12 h-12 ${ring} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
        </motion.div>
      ))}
    </div>
  )
}
