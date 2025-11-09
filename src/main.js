import './style.css'

const root = document.querySelector('#app')

function analyzeTone(text) {
  const negatives = [
    'burro', 'idiota', 'estúpido', 'nojento', 'fedido', 'porco', 'insuportável', 'péssimo', 'horrível', 'palhaço', 'chato', 'detesto',
    'pare de', 'nunca faça', 'você precisa', 'você tem que', 'ridículo', 'vergonha', 'mau cheiro', 'hálito ruim'
  ]
  const lower = text.toLowerCase()
  const issues = []
  for (const w of negatives) {
    if (lower.includes(w)) issues.push(w)
  }
  const exclamations = (text.match(/!{2,}/g) || []).length
  let score = 100 - issues.length * 15 - exclamations * 5
  score = Math.max(0, Math.min(100, score))
  const suggestions = []
  if (issues.length) suggestions.push('Evite termos duros; troque por sugestões gentis.')
  if (/você precisa|você tem que/i.test(text)) suggestions.push('Prefira “talvez” ou “pode ajudar” em vez de imposições.')
  if (/pare de/i.test(text)) suggestions.push('Tente “talvez diminuir” ou “evitar quando possível”.')
  if (/hálito|mau cheiro/i.test(text)) suggestions.push('Sugira “cuidar um pouco mais do hálito/cheiro” de forma cuidadosa.')
  const quality = score >= 75 ? 'respeitoso' : 'ajustar'
  return { score, issues, exclamations, quality, suggestions }
}

function encodeMessage(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)))
  } catch (e) {
    return btoa(text)
  }
}
function decodeMessage(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)))
  } catch (e) {
    try { return atob(b64) } catch { return null }
  }
}

function buildShareLink(message) {
  const encoded = encodeMessage(message)
  const origin = window.location.origin
  return `${origin}/?m=${encoded}`
}

function getMessageFromURL() {
  const params = new URLSearchParams(window.location.search)
  const m = params.get('m')
  if (!m) return null
  return decodeMessage(m)
}

function tryLaunchProtocol(url) {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 0)
}

function openInNewTab(url) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 0)
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function shareNative({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {
      return false
    }
  }
  return false
}

function showPrompt({ title, label, placeholder = '', initialValue = '', type = 'text', okText = 'Enviar', validate }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'ta-modal-overlay'
    const modal = document.createElement('div')
    modal.className = 'ta-modal'
    modal.innerHTML = `
      <h3 class="ta-modal-title">${title}</h3>
      <label class="ta-modal-label">${label}</label>
      <input class="ta-modal-input" type="${type}" placeholder="${placeholder}" value="${initialValue}" />
      <div class="ta-modal-error" id="ta-modal-error"></div>
      <div class="ta-modal-actions">
        <button class="ta-btn ta-btn-secondary" id="ta-cancel">Cancelar</button>
        <button class="ta-btn" id="ta-ok">${okText}</button>
      </div>
    `
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    const input = modal.querySelector('.ta-modal-input')
    const err = modal.querySelector('#ta-modal-error')
    const ok = modal.querySelector('#ta-ok')
    const cancel = modal.querySelector('#ta-cancel')

    function close(value) {
      document.body.removeChild(overlay)
      resolve(value)
    }
    function runValidate() {
      if (typeof validate === 'function') {
        const v = validate(input.value)
        if (v && v.error) {
          err.textContent = v.error
          return null
        }
        return v && v.value !== undefined ? v.value : input.value
      }
      return input.value
    }
    ok.addEventListener('click', () => {
      const val = runValidate()
      if (val === null) return
      close(val)
    })
    cancel.addEventListener('click', () => close(null))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = runValidate()
        if (val === null) return
        close(val)
      } else if (e.key === 'Escape') {
        close(null)
      }
    })
    input.focus()
  })
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizePhoneForWhatsApp(raw) {
  const hasPlus = /^\s*\+/.test(raw)
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return { error: 'Informe um número.' }
  // If looks like BR local (11 digits), assume +55
  let normalized = digits
  if (!hasPlus && digits.length === 11) {
    normalized = '55' + digits
  }
  if (normalized.length < 12 || normalized.length > 15) {
    return { error: 'Inclua DDI (ex.: +55...) e apenas números.' }
  }
  return { value: normalized }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
}

function renderCompose() {
  document.title = 'Toque Anônimo — Compor'
  const container = document.createElement('div')
  container.className = 'ta-container'

  const header = `
    <h1>Toque Anônimo</h1>
    <p class="tagline">A verdade pode ser dita com carinho — cuide das suas relações sem constrangimento.</p>
  `
  container.innerHTML = header

  const controls = document.createElement('div')
  controls.className = 'ta-controls'
  controls.innerHTML = `
    <label class="ta-label">Escreva seu toque (anônimo, empático e positivo):</label>
    <textarea id="ta-input" rows="7" placeholder="Ex.: Alguém que se importa quer te dar um toque: talvez cuidar um pouco mais do hálito possa te ajudar em conversas e no trabalho. ❤️"></textarea>

    <div class="ta-row">
      <select id="ta-category">
        <option value="higiene">Higiene / Hálito</option>
        <option value="atrasos">Atrasos</option>
        <option value="atitude">Atitudes</option>
        <option value="elogio">Toques do Bem (Elogios)</option>
      </select>
      <button id="ta-insert-template">Inserir modelo</button>
      <label class="ta-toggle">
        <input type="checkbox" id="ta-positive" />
        <span>Modo Positivo</span>
      </label>
    </div>

    <div id="ta-tone" class="ta-tone"></div>

    <div class="ta-actions">
      <button id="ta-copy-text">Copiar texto</button>
      <button id="ta-copy">Copiar link anônimo</button>
      <button id="ta-whatsapp">Enviar via WhatsApp</button>
      <button id="ta-email">Enviar por E-mail</button>
      <button id="ta-sms">Enviar por SMS</button>
    </div>

    <p class="ta-disclaimer">Sigilo garantido: o link não revela quem enviou. Você escolhe como compartilhar (WhatsApp, SMS, e-mail, etc.).</p>
  `
  container.appendChild(controls)

  const preview = document.createElement('div')
  preview.className = 'ta-preview'
  preview.innerHTML = `
    <h2>Pré-visualização</h2>
    <div id="ta-preview-text" class="ta-preview-box"></div>
  `
  container.appendChild(preview)

  root.innerHTML = ''
  root.appendChild(container)

  const input = container.querySelector('#ta-input')
  const category = container.querySelector('#ta-category')
  const positiveToggle = container.querySelector('#ta-positive')
  const toneBox = container.querySelector('#ta-tone')
  const previewText = container.querySelector('#ta-preview-text')

  function applyPositive(text) {
    if (!positiveToggle.checked) return text
    return text
      .replace(/\b(você precisa|você tem que)\b/gi, 'talvez possa te ajudar a')
      .replace(/\b(pare de)\b/gi, 'talvez diminuir')
      .replace(/\b(ruim|péssimo|horrível)\b/gi, 'pode melhorar')
      .replace(/!{2,}/g, '!')
  }

  function updateAnalysis() {
    let text = input.value.trim()
    text = applyPositive(text)
    const analysis = analyzeTone(text)
    previewText.textContent = text || 'Sua mensagem aparecerá aqui...'
    toneBox.innerHTML = `
      <div class="ta-score">
        <strong>Filtro de tom:</strong> ${analysis.quality === 'respeitoso' ? 'Respeitoso' : 'Ajustes recomendados'}
        • Score: ${analysis.score}/100
      </div>
      ${analysis.issues.length ? `<div class="ta-issues">Palavras a evitar: ${analysis.issues.join(', ')}</div>` : ''}
      ${analysis.suggestions.length ? `<ul class="ta-suggestions">${analysis.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
    `
  }

  const insertBtn = container.querySelector('#ta-insert-template')
  insertBtn.addEventListener('click', () => {
    const map = {
      higiene: [
        'Alguém que se importa quer te dar um toque: talvez cuidar um pouco mais do hálito possa te ajudar em conversas e no trabalho. ❤️',
        'Um toque do bem: ajustar um pouco o perfume/cheiro pode deixar a convivência mais agradável. 😊'
      ],
      atrasos: [
        'Um amigo anônimo notou que alguns atrasos têm acontecido; talvez ajustar o horário possa te ajudar a brilhar ainda mais. ⏰',
        'Se puder chegar uns minutinhos antes, vai fazer uma grande diferença. Estamos torcendo por você! 🙌'
      ],
      atitude: [
        'Você é incrível! Um toque: ouvir um pouco mais nas reuniões pode ajudar todos a aproveitar suas ideias. 💡',
        'Seu jeito é único. Às vezes, falar um pouco mais baixo pode deixar o ambiente mais leve. ✨'
      ],
      elogio: [
        'Toque do Bem: sua dedicação inspira! Obrigado por ser tão comprometido. 🌟',
        'Alguém anônimo acha sua energia maravilhosa — continue espalhando isso por aí! 💛'
      ]
    }
    const list = map[category.value] || []
    input.value = list[0] || ''
    updateAnalysis()
  })

  input.addEventListener('input', updateAnalysis)
  positiveToggle.addEventListener('change', updateAnalysis)
  updateAnalysis()

  const copyBtn = container.querySelector('#ta-copy')
  const copyTextBtn = container.querySelector('#ta-copy-text')
  const waBtn = container.querySelector('#ta-whatsapp')
  const emailBtn = container.querySelector('#ta-email')
  const smsBtn = container.querySelector('#ta-sms')

  function currentMessage() { return applyPositive(input.value.trim()) }

  copyBtn.addEventListener('click', async () => {
    const link = buildShareLink(currentMessage())
    try {
      await navigator.clipboard.writeText(link)
      copyBtn.textContent = 'Link copiado!'
      setTimeout(() => (copyBtn.textContent = 'Copiar link anônimo'), 2000)
    } catch {
      alert('Não foi possível copiar. Link: ' + link)
    }
  })

  waBtn.addEventListener('click', async () => {
    const phone = await showPrompt({
      title: 'Enviar via WhatsApp',
      label: 'Número do destinatário (inclua DDI, ex.: +55...)',
      placeholder: '+5511999999999',
      type: 'tel',
      okText: 'Enviar',
      validate: normalizePhoneForWhatsApp
    })
    if (!phone) return
    const link = buildShareLink(currentMessage())
    const text = `💬 Toque Anônimo:\n${link}`
    const base = isMobile() ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send'
    const url = `${base}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
    openInNewTab(url)
    const copied = await copyToClipboard(text)
    waBtn.textContent = copied ? 'Abrimos WhatsApp (texto copiado)' : 'Abrimos WhatsApp — copie e cole'
    setTimeout(() => (waBtn.textContent = 'Enviar via WhatsApp'), 2500)
  })

  emailBtn.addEventListener('click', async () => {
    const email = await showPrompt({
      title: 'Enviar por E-mail',
      label: 'E-mail do destinatário',
      placeholder: 'exemplo@dominio.com',
      type: 'email',
      okText: 'Enviar',
      validate: (value) => (isValidEmail(value) ? { value } : { error: 'Informe um e-mail válido.' })
    })
    if (!email) return
    const link = buildShareLink(currentMessage())
    const subject = 'Toque Anônimo'
    const body = `Alguém que se importa quer te dar um toque:\n\n${link}\n\n(Abra o link para ler a mensagem.)`
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    tryLaunchProtocol(url)
    const copied = await copyToClipboard(body)
    emailBtn.textContent = copied ? 'Abrimos e-mail (conteúdo copiado)' : 'Abrimos e-mail — copie e cole'
    setTimeout(() => (emailBtn.textContent = 'Enviar por E-mail'), 2500)
  })

  smsBtn.addEventListener('click', async () => {
    const link = buildShareLink(currentMessage())
    const body = `Toque Anônimo: ${link}`
    const shared = await shareNative({ title: 'Toque Anônimo', text: body, url: link })
    if (!shared) {
      if (isMobile()) {
        const url = `sms:?&body=${encodeURIComponent(body)}`
        tryLaunchProtocol(url)
      }
    }
    try {
      await navigator.clipboard.writeText(body)
      smsBtn.textContent = isMobile() ? 'Abrimos seu SMS (conteúdo copiado)' : 'Copiamos o texto (use seu app de SMS)'
    } catch {
      smsBtn.textContent = 'Se não abrir, copie e cole o texto'
    }
    setTimeout(() => (smsBtn.textContent = 'Enviar por SMS'), 2500)
  })

  // Oculta SMS em desktop, onde geralmente não há handler
  if (!isMobile()) {
    smsBtn.style.display = 'none'
  }

  copyTextBtn.addEventListener('click', async () => {
    const msg = currentMessage()
    const ok = await copyToClipboard(msg)
    copyTextBtn.textContent = ok ? 'Texto copiado!' : 'Não foi possível copiar'
    setTimeout(() => (copyTextBtn.textContent = 'Copiar texto'), 2000)
  })
}

function renderView(message) {
  document.title = 'Toque Anônimo — Visualizar'
  const container = document.createElement('div')
  container.className = 'ta-container'
  container.innerHTML = `
    <h1>Você recebeu um Toque Anônimo</h1>
    <div class="ta-view-box">${escapeHtml(message)}</div>
    <p class="ta-note">Este toque foi enviado com carinho, para ajudar você a brilhar ainda mais. 🌟</p>
    <div class="ta-actions">
      <a href="/" class="ta-btn">Enviar um Toque</a>
    </div>
  `
  root.innerHTML = ''
  root.appendChild(container)
}

const message = getMessageFromURL()
if (message) {
  renderView(message)
} else {
  renderCompose()
}
