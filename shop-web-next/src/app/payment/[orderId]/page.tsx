'use client'

import { useParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import { ScrollReveal } from '@/components/design/scroll-reveal'
import { usePayment } from '@/hooks/use-payment'
import { PaymentIdleView } from '@/components/payment/idle-view'
import { PaymentProcessingView } from '@/components/payment/processing-view'
import { PaymentSuccessView } from '@/components/payment/success-view'
import { PaymentFailedView } from '@/components/payment/failed-view'

export default function PaymentPage() {
  const params = useParams()
  const orderId = parseInt(params.orderId as string)

  const {
    order,
    paymentStatus,
    countdown,
    loadError,
    totalAmount,
    handlePay,
    handleRetry,
    formatTime,
  } = usePayment(orderId)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <ScrollReveal className="max-w-xl mx-auto">
          <Card className="p-8 sm:p-12 glass border-border/50 rounded-2xl shadow-xl shadow-primary/5 text-center overflow-hidden relative">
            {/* 装饰背景 */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-primary" />

            {loadError ? (
              <div className="py-12">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-muted-foreground mb-4">{loadError}</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20">
                  重新加载
                </Button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {paymentStatus === 'idle' && (
                  <PaymentIdleView
                    key="idle"
                    order={order}
                    countdown={countdown}
                    totalAmount={totalAmount}
                    formatTime={formatTime}
                    onPay={handlePay}
                  />
                )}

                {paymentStatus === 'processing' && (
                  <PaymentProcessingView key="processing" />
                )}

                {paymentStatus === 'success' && (
                  <PaymentSuccessView key="success" orderId={orderId} />
                )}

                {paymentStatus === 'failed' && (
                  <PaymentFailedView
                    key="failed"
                    countdown={countdown}
                    onRetry={handleRetry}
                  />
                )}
              </AnimatePresence>
            )}
          </Card>
        </ScrollReveal>
      </main>
    </div>
  )
}
