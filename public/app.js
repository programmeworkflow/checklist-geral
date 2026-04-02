// ===== SIGNATURE CANVAS =====
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.min(600, rect.width - 20);
  canvas.width = w;
  canvas.height = 150;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseleave', () => isDrawing = false);

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
});

canvas.addEventListener('touchend', () => isDrawing = false);

document.getElementById('clearSignature').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ===== LOCAL STORAGE =====
const STORAGE_KEY = 'checklist_geral_data';

function getFormData() {
  const form = document.getElementById('checklistForm');
  const data = {};

  form.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
    data[el.name] = el.value;
  });

  form.querySelectorAll('input[type="checkbox"]').forEach(el => {
    data[el.name] = el.checked;
  });

  form.querySelectorAll('input[type="radio"]:checked').forEach(el => {
    data[el.name] = el.value;
  });

  // Signature
  data._signature = canvas.toDataURL();

  return data;
}

function loadFormData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    const form = document.getElementById('checklistForm');

    form.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
      if (data[el.name] !== undefined) el.value = data[el.name];
    });

    form.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (data[el.name] !== undefined) el.checked = data[el.name];
    });

    form.querySelectorAll('input[type="radio"]').forEach(el => {
      if (data[el.name] && data[el.name] === el.value) el.checked = true;
    });

    if (data._signature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = data._signature;
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

// ===== SAVE =====
document.getElementById('btnSave').addEventListener('click', () => {
  const data = getFormData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  showSummary(data);
  showNotification('Checklist salvo com sucesso!');
});

// ===== PRINT =====
document.getElementById('btnPrint').addEventListener('click', () => {
  window.print();
});

// ===== CLEAR =====
document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('Tem certeza que deseja limpar todo o formulário?')) return;
  const form = document.getElementById('checklistForm');
  form.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => el.value = '');
  form.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
  form.querySelectorAll('input[type="radio"]').forEach(el => el.checked = false);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('summaryPanel').style.display = 'none';
  showNotification('Formulário limpo!');
});

// ===== SUMMARY =====
function showSummary(data) {
  const panel = document.getElementById('summaryPanel');
  const content = document.getElementById('summaryContent');

  // Count checked risks by category
  const categories = {
    'Acidentes': { prefix: 'risk_ac_', count: 0, items: [] },
    'Biológicos': { prefix: 'risk_bio_', count: 0, items: [] },
    'AEP': { prefix: 'risk_aep_', count: 0, items: [] },
    'Físicos': { prefix: 'risk_fis_', count: 0, items: [] },
    'Químicos': { prefix: 'risk_qui_', count: 0, items: [] }
  };

  // Map risk names
  const riskNames = {};
  document.querySelectorAll('.risk-table tbody tr').forEach(tr => {
    const cb = tr.querySelector('input[type="checkbox"]');
    const name = tr.querySelectorAll('td')[1];
    if (cb && name) riskNames[cb.name] = name.textContent.trim();
  });

  for (const [cat, info] of Object.entries(categories)) {
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith(info.prefix) && val === true) {
        info.count++;
        if (riskNames[key]) info.items.push(riskNames[key]);
      }
    }
  }

  // Count EPIs
  let epiCount = 0;
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('epi_') && val === true) epiCount++;
  }

  // Count trainings
  let trCount = 0;
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('tr_') && val === true) trCount++;
  }

  // Total risks
  const totalRisks = Object.values(categories).reduce((s, c) => s + c.count, 0);

  let html = `
    <div class="summary-section">
      <h3>Empresa: ${data.nomeEmpresa || '—'} | Funcionário: ${data.funcionario || '—'}</h3>
      <p>Cargo: ${data.cargo || '—'} | Data: ${data.dataVisita || '—'}</p>
    </div>
    <div class="summary-section">
      <h3>Riscos Identificados <span class="summary-count">${totalRisks} total</span></h3>
  `;

  for (const [cat, info] of Object.entries(categories)) {
    if (info.count > 0) {
      html += `<p><strong>${cat}:</strong> ${info.count} risco(s)</p><ul>`;
      info.items.forEach(item => html += `<li>${item}</li>`);
      html += '</ul>';
    }
  }

  html += `
    </div>
    <div class="summary-section">
      <h3>EPIs Selecionados <span class="summary-count">${epiCount}</span></h3>
    </div>
    <div class="summary-section">
      <h3>Treinamentos <span class="summary-count">${trCount}</span></h3>
    </div>
  `;

  content.innerHTML = html;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });
}

// ===== NOTIFICATION =====
function showNotification(msg) {
  const notif = document.createElement('div');
  notif.textContent = msg;
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #27ae60; color: #fff;
    padding: 12px 24px; border-radius: 8px;
    font-weight: 600; font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999; animation: fadeIn 0.3s;
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 2500);
}

// ===== HIGHLIGHT CHECKED ROWS =====
document.querySelectorAll('.risk-table input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', function() {
    const row = this.closest('tr');
    if (this.checked) {
      row.style.background = '#fff8e1';
    } else {
      row.style.background = '';
    }
  });
});

// ===== LOAD ON START =====
loadFormData();
