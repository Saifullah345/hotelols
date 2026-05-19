import { cn } from '@/utils/cn'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
  prefix?: string
  suffix?: string
}

export function StatsCard({
  title, value, change, icon: Icon,
  iconColor = 'text-primary-600',
  iconBg = 'bg-primary-50',
  prefix = '',
  suffix = '',
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-gray-900">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change)}% vs last month
          </div>
        )}
      </div>
    </div>
  )
}
