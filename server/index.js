import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import twilioPkg from 'twilio'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787

app.use(express.json())
app.use(cors({ origin: true }))

// Simple content safeguard: reject blatantly offensive terms
function analyzeToneServer(text) {
  const negatives = [
    'burro','idiota','estúpido','nojento','fedido','porco','insuportável','péssimo','horrível','palhaço','chato','detesto','ridículo','vergonha','mau cheiro','hálito ruim'
  ]
  const lower = (text || '').toLowerCase()
  const issues = negatives.filter(w => lower.includes(w))
  const exclamations = (text.match(/!{2,}/g) || []).length
  const score = Math.max(0, 100 - issues.length * 15 - exclamations * 5)
  return { score, issues }
}

function assertRespectful(text) {
  const { score } = analyzeToneServer(text || '')
  if (score < 50) {
    const err = new Error('Mensagem considerada agressiva. Ajuste o tom e tente novamente.')
    err.status = 422
    throw err
  }
}

function randomAlias(domain) {
  const id = Math.random().toString(36).slice(2, 10)
  return `ta-${id}@${domain}`
}

function ensureTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  })
  return transporter
}

function ensureTwilio() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) return null
  const twilio = twilioPkg(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  return { twilio, from: TWILIO_FROM }
}

app.post('/api/send/email', async (req, res) => {
  try {
    const { to, message } = req.body || {}
    if (!to || !message) return res.status(400).json({ error: 'Parâmetros inválidos.' })
    assertRespectful(message)

    const transporter = ensureTransport()
    if (!transporter) return res.status(501).json({ error: 'Servidor de e-mail não configurado.' })

    const domain = process.env.EMAIL_DOMAIN || 'example.com'
    const fromAddress = process.env.EMAIL_FROM || randomAlias(domain)
    const subject = 'Toque Anônimo'
    const bodyText = message

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: bodyText
    })
    return res.json({ ok: true, id: info.messageId })
  } catch (err) {
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Erro ao enviar e-mail.' })
  }
})

app.post('/api/send/sms', async (req, res) => {
  try {
    const { to, message } = req.body || {}
    if (!to || !message) return res.status(400).json({ error: 'Parâmetros inválidos.' })
    assertRespectful(message)

    const tw = ensureTwilio()
    if (!tw) return res.status(501).json({ error: 'Servidor de SMS não configurado.' })

    const { twilio, from } = tw
    const info = await twilio.messages.create({ from, to, body: message })
    return res.json({ ok: true, sid: info.sid })
  } catch (err) {
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Erro ao enviar SMS.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`[server] Toque Anônimo API rodando em http://localhost:${PORT}`)
})