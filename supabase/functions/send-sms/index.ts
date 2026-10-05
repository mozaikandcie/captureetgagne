// Hook « Send SMS » de Supabase Auth → Brevo (SMS transactionnel).
// Configuration : Auth > Hooks > Send SMS > HTTPS, secret = SEND_SMS_HOOK_SECRET.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

interface HookPayload {
  user: { phone: string }
  sms: { otp: string }
}

const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')?.replace('v1,whsec_', '')
const brevoKey = Deno.env.get('BREVO_API_KEY')
const sender = Deno.env.get('BREVO_SMS_SENDER') ?? 'AMBYANS'

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (!hookSecret || !brevoKey) return fail(500, 'Configuration manquante')

  const body = await req.text()
  let payload: HookPayload
  try {
    payload = new Webhook(hookSecret).verify(body, Object.fromEntries(req.headers)) as HookPayload
  } catch {
    return fail(401, 'Signature invalide')
  }

  // Brevo attend le numéro sans « + » (format international).
  const recipient = payload.user.phone.replace(/^\+/, '')
  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender,
      recipient,
      content: `Capture et Gagne : votre code est ${payload.sms.otp}`,
      type: 'transactional',
    }),
  })
  if (!res.ok) {
    console.error('Brevo', res.status, await res.text())
    return fail(502, 'Envoi du SMS impossible')
  }
  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
