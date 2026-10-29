import type { Logger } from '@workspace/logging'
import type { OperationsAlert } from '../prometheus/index.js'

export type AlertNotifier = Readonly<{ enabled: boolean; publish: (alerts: readonly OperationsAlert[]) => Promise<void> }>

export const createAlertWebhook = (url: string | undefined, logger: Logger): AlertNotifier => {
    const lastSent = new Map<string, number>()
    return Object.freeze({
        enabled: Boolean(url),
        publish: async (alerts) => {
            if (!url) return
            const active = new Set(alerts.map((alert) => alert.id))
            for (const id of lastSent.keys()) if (!active.has(id)) lastSent.delete(id)
            for (const alert of alerts) {
                const sentAt = lastSent.get(alert.id) ?? 0
                if (Date.now() - sentAt < 10 * 60_000) continue
                lastSent.set(alert.id, Date.now())
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.detail}` }),
                        signal: AbortSignal.timeout(2_500)
                    })
                    if (!response.ok) logger.warn('Operations alert webhook returned an error.', { statusCode: response.status, alertId: alert.id })
                } catch {
                    lastSent.delete(alert.id)
                    logger.warn('Operations alert webhook delivery failed.', { alertId: alert.id })
                }
            }
        }
    })
}
