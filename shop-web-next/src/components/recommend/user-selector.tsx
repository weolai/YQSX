'use client'

import { useState } from 'react'
import { RefreshCw, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { productApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'

interface UserSelectorProps {
  onUserChange?: (userId: number) => void
}

export function UserSelector({ onUserChange }: UserSelectorProps) {
  const { tianchiUserId, setTianchiUserId } = useAuthStore()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleSwitchUser = async () => {
    setIsSwitching(true)
    try {
      const users = await productApi.getSampleUsers()
      if (users && users.length > 0) {
        // 随机选一个不同的用户
        let newUserId = tianchiUserId
        while (newUserId === tianchiUserId && users.length > 1) {
          newUserId = users[Math.floor(Math.random() * users.length)]
        }
        if (newUserId !== null && newUserId !== tianchiUserId) {
          setTianchiUserId(newUserId)
          onUserChange?.(newUserId)
        } else if (users.length === 1) {
          const singleUserId = users[0]
          setTianchiUserId(singleUserId)
          onUserChange?.(singleUserId)
        }
      }
    } catch (error) {
      console.error('切换用户失败:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl glass">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="w-5 h-5" />
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">当前推荐用户</div>
          <div className="text-sm font-medium text-foreground">
            #{tianchiUserId ?? '未分配'}
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-border/50 hidden sm:block" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleSwitchUser}
        disabled={isSwitching}
        className="rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isSwitching ? 'animate-spin' : ''}`} />
        {isSwitching ? '切换中...' : '换一个用户'}
      </Button>

      {isSwitching && (
        <TextShimmer className="text-xs" as="span">
          正在分配新用户...
        </TextShimmer>
      )}
    </div>
  )
}
