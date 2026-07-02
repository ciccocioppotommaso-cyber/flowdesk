import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

interface EmailConfermaParams {
  clienteEmail: string
  clienteNome: string
  nomeLocale: string
  tipo: string
  data?: string
  ora?: string
  coperti?: number
  allergie?: string
  occasione?: string
  servizio?: string
  messaggioProposta?: string // messaggio dell'host incluso nella proposta accettata
}

interface EmailPropostaParams extends EmailConfermaParams {
  token: string
  messaggio?: string
}

interface EmailRifiutoParams {
  clienteEmail: string
  clienteNome: string
  nomeLocale: string
  tipo: string
}

function buildDettagliRighe(p: Partial<EmailConfermaParams>) {
  const { tipo, data, ora, coperti, allergie, occasione, servizio } = p
  const isTavolo = tipo === 'tavolo'
  const dataFormattata = data
    ? new Date(data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return [
    dataFormattata && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">📅 Data</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${dataFormattata}</td></tr>`,
    ora && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">🕐 Orario</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${ora}</td></tr>`,
    isTavolo && coperti && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">🪑 Coperti</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${coperti} ${coperti === 1 ? 'persona' : 'persone'}</td></tr>`,
    !isTavolo && servizio && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">⚙️ Servizio</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${servizio}</td></tr>`,
    allergie && allergie.toLowerCase() !== 'nessuna' && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">⚠️ Allergie</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${allergie}</td></tr>`,
    occasione && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">🎉 Occasione</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${occasione}</td></tr>`,
  ].filter(Boolean).join('\n')
}

function wrapEmail(nomeLocale: string, headerColor: string, headerEmoji: string, titolo: string, body: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:${headerColor};padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${nomeLocale}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${headerEmoji} ${titolo}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">${body}</td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">${nomeLocale}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const EMAIL_DISABLED = process.env.DISABLE_EMAIL === 'true'

export async function sendEmailConferma(params: EmailConfermaParams) {
  if (EMAIL_DISABLED || !process.env.RESEND_API_KEY || !params.clienteEmail) return
  const isTavolo = params.tipo === 'tavolo'
  const dettagli = buildDettagliRighe(params)

  const html = wrapEmail(
    params.nomeLocale,
    '#4f46e5',
    isTavolo ? '🍽️' : '✅',
    isTavolo ? 'Prenotazione confermata' : 'Appuntamento confermato',
    `<p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Ciao <strong>${params.clienteNome}</strong>,<br>
      la tua ${isTavolo ? 'prenotazione' : 'richiesta'} è stata confermata. Ecco il riepilogo:
    </p>
    ${params.messaggioProposta ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;color:#15803d;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Dettagli concordati</p>
      <p style="margin:0;color:#166534;font-size:14px;">${params.messaggioProposta}</p>
    </div>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;margin-bottom:24px;">${dettagli}</table>
    <p style="margin:0;color:#6b7280;font-size:13px;">Per qualsiasi informazione o modifica, contattaci direttamente.<br>A presto!</p>`
  )

  await resend.emails.send({
    from: `${params.nomeLocale} <onboarding@resend.dev>`,
    to: params.clienteEmail,
    subject: isTavolo ? `Prenotazione confermata — ${params.nomeLocale}` : `Appuntamento confermato — ${params.nomeLocale}`,
    html,
  })
}

export async function sendEmailProposta(params: EmailPropostaParams) {
  if (EMAIL_DISABLED || !process.env.RESEND_API_KEY || !params.clienteEmail) return
  const isTavolo = params.tipo === 'tavolo'
  const dettagli = buildDettagliRighe(params)
  const linkAccetta = `${BASE_URL}/risposta/${params.token}?azione=accetta`
  const linkRifiuta = `${BASE_URL}/risposta/${params.token}?azione=rifiuta`

  const html = wrapEmail(
    params.nomeLocale,
    '#d97706',
    '📋',
    'Proposta di modifica',
    `<p style="margin:0 0 16px;color:#374151;font-size:15px;">
      Ciao <strong>${params.clienteNome}</strong>,<br>
      abbiamo ricevuto la tua richiesta e vorremmo proporti alcune modifiche.
    </p>
    ${params.messaggio ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0;color:#92400e;font-size:14px;">${params.messaggio}</p>
    </div>` : ''}
    <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">Dettagli proposti:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;margin-bottom:24px;">${dettagli}</table>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;">Cosa vuoi fare?</p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:12px;">
          <a href="${linkAccetta}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">✓ Accetto</a>
        </td>
        <td>
          <a href="${linkRifiuta}" style="display:inline-block;background:#ffffff;color:#dc2626;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #dc2626;">✕ Rifiuto</a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">I link scadono dopo la risposta. Per assistenza contattaci direttamente.</p>`
  )

  await resend.emails.send({
    from: `${params.nomeLocale} <onboarding@resend.dev>`,
    to: params.clienteEmail,
    subject: `Proposta di modifica — ${params.nomeLocale}`,
    html,
  })
}

export async function sendEmailRifiuto(params: EmailRifiutoParams) {
  if (EMAIL_DISABLED || !process.env.RESEND_API_KEY || !params.clienteEmail) return
  const isTavolo = params.tipo === 'tavolo'

  const html = wrapEmail(
    params.nomeLocale,
    '#dc2626',
    '❌',
    isTavolo ? 'Prenotazione non disponibile' : 'Richiesta non accettata',
    `<p style="margin:0 0 16px;color:#374151;font-size:15px;">
      Ciao <strong>${params.clienteNome}</strong>,<br>
      siamo spiacenti ma al momento non possiamo accettare la tua ${isTavolo ? 'prenotazione' : 'richiesta'}.
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Ti invitiamo a contattarci direttamente per trovare un'alternativa.<br>Ci scusiamo per l'inconveniente.</p>`
  )

  await resend.emails.send({
    from: `${params.nomeLocale} <onboarding@resend.dev>`,
    to: params.clienteEmail,
    subject: `${params.nomeLocale} — risposta alla tua richiesta`,
    html,
  })
}
