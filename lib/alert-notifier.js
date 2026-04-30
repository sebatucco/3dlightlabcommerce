import { logError, logInfo } from '@/lib/observability'

const lastSentByKey = new Map()

function shouldSend(key, cooldownMs) {
  const now = Date.now()
  const last = lastSentByKey.get(key) || 0
  if (now - last < cooldownMs) return false
  lastSentByKey.set(key, now)
  return true
}

export async function sendAlertWebhook({ key, title, payload }) {
  const webhookUrl = String(process.env.ALERT_WEBHOOK_URL || '').trim()
  if (!webhookUrl) return false

  const cooldownMs = Number(process.env.ALERT_WEBHOOK_COOLDOWN_MS || 10 * 60 * 1000)
  if (!shouldSend(key, cooldownMs)) return false

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: title,
        ...payload,
      }),
    })

    if (!response.ok) {
      logError('alerts.webhook.failed', {
        key,
        status: response.status,
      })
      return false
    }

    logInfo('alerts.webhook.sent', { key })
    return true
  } catch (error) {
    logError('alerts.webhook.error', {
      key,
      error: error?.message || 'Unknown error',
    })
    return false
  }
}
