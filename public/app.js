// ========================================================
// DATA DEFINITIONS
// ========================================================
const RISKS = {
  accident: {
    label: 'Acidentes',
    type: 'accident',
    items: [
      'Abastecimento de veículos, máquinas, motores','Afogamento',
      'Ataques de animais (domésticos / semelhantes)','Ataques de animais peçonhentos',
      'Atividades sujeitas a chuvas / tempestades','Atrito entre as mãos e material (calo nas mãos)',
      'Atropelamentos','Choques elétricos (condições, atividades etc.)',
      'Compressor de ar / caldeiras','Condução de veículos e/ou operação de máquinas',
      'Cortes / escoriações / perfurações','Engolfamento / encarceramento',
      'Escorregões, tropeços, quedas','Espaços confinados',
      'Explosões (líquidos, gases, poeiras, mat. sólidos)','Iluminação inadequada (espec. a qtd. de lux)',
      'Manuseio de pequenas qtd. de líquidos inflamáveis','Máquinas rotativas manuais',
      'Máquinas / equipamentos sem proteção – NR 12','Mosquitos (áreas de campo que exigem repelente)',
      'Prensamento de membros / aprisionamento','Projeção de partículas',
      'Queda de objetos e/ou materiais','Queimaduras',
      'Trabalho a quente – NR 34','Trabalho em altura'
    ]
  },
  biological: {
    label: 'Biológicos',
    type: 'biological',
    items: [
      'Água parada / Parasitas / Insetos','Contato com cadáveres',
      'Contato com material infecto-contagiantes','Contato com pacientes possivelmente infectados',
      'Limpeza de estábulos de animais','Manipulação de alimentos',
      'Recolhimento de lixo público (Qtd. pessoas locais)','Vírus / Bactérias / Fungos / Protozoários'
    ]
  },
  ergonomic: {
    label: 'AEP – Avaliação Ergonômica Preliminar',
    type: 'ergonomic',
    items: [
      'Acúmulo de horas extras','Ausência de móvel / dispositivo / equipamento',
      'Esforço fonatório (vocal)','Estresse psíquico',
      'Exigência de frequente flexões da coluna vertebral','Falta de funcionários / excesso de demandas',
      'Fatores psicossociais diversos (especifique)','Frequente deslocamento a pé',
      'Levantamento e transporte manual de peso','Movimentos repetitivos',
      'Postura em pé por longos períodos','Postura sentada por longos períodos',
      'Posturas incômodas por longos períodos','Trabalho noturno (atua por escala?)'
    ]
  },
  physical: {
    label: 'Físicos',
    type: 'physical',
    items: [
      'Calor por fonte natural (cabine de veículos)','Exposição a calor (gerado por fonte artificial)',
      'Exposição ao frio (câmaras frias)','Exposição aos raios solares / radiação ultravioleta',
      'Radiação ionizante','Realiza Raio-X (ou exp. a raios alfa, beta ou gama)',
      'Ruído contínuo e/ou intermitente (quantitativo)','Ruído qualitativo (abaixo do nível de ação)',
      'Umidade / contato com água de forma habitual','Vibração – VCI','Vibração – VMB'
    ]
  },
  chemical: {
    label: 'Químicos',
    type: 'chemical',
    items: [
      'Aplicação de defensivos agrícolas','Aplicação de inseticidas',
      'Contato com óleos e graxas / Superlub','Contato com substâncias químicas em geral',
      'Contato com Thyner','Exposição a fumaças','Exposição a poeiras incômodas',
      'Fumos metálicos provenientes de solda','Gases / névoas / vapores químicos',
      'Petróleo, xisto betuminoso e seus derivados','Pintura com pincel (fotos das tintas)',
      'Pintura com pistola (fotos das tintas)','Pintura com spray (fotos das tintas)',
      'Utilização de produtos de limpeza (saponáceos)'
    ]
  }
};

const EPIS = [
  'Avental de raspa','Avental impermeável','Bota impermeável PVC','Botina de segurança',
  'Calça térmica (frio)','Capa de chuva','Capacete de segurança','Balaclava (frio / NR 10)',
  'Cinta ergonômica','Cinto de segurança','Colete refletivo','Conj. Aplic. agrotóxicos',
  'Jaleco hospitalar','Japona térmica (frio)','Luva antivibração','Luva de procedimento (saúde)',
  'Luva de raspa','Luva de vaqueta','Luva estéril','Luva látex','Luva malha de aço',
  'Luva nitrílica / neoprex','Luva para eletricidade','Luva pigmentada / PU',
  'Luva plástica (p/ alimentos)','Luva química','Luva térmica (queimadura)','Luva térmica (frio)',
  'Macacão de plástico','Manga de raspa','Másc. de procedimento','Másc. de solda',
  'Másc. PFF sem filtro','Másc. PFF com filtro','Meia térmica (frio)','Óculos de proteção',
  'Perneira de raspa','Perneira de segurança','Propé descartável','Prot. auricular concha',
  'Prot. auricular plug','Protetor de tireoide','Protetor facial','Protetor solar',
  'Respirador com filtro','Roupa antichama','Sapato c/ solado antiderrapante',
  'Talabarte de posicionamento','Talabarte de retenção','Touca','Touca árabe (raios solares)',
  'Trava quedas (08mm ou 12mm)','Trava quedas retrátil','Vestimenta p/ apicultura',
  'Vestimenta plástica (biológicos)','Vestimenta de alumínio (calor)'
];

const TRAININGS = [
  'NR 01','NR 05','NR 06','NR 10','NR 11','NR 12','NR 13','NR 17','NR 18',
  'NR 20','NR 22','NR 23','NR 31','NR 31.7','NR 32','NR 33','NR 34','NR 35',
  'NR 36','NR 38','NT 12'
];

const PERICULOSIDADE = [
  'Explosivos','Inflamáveis','Segurança patrimonial','Eletricidade','Motocicletas'
];

const APOSENTADORIA = [
  'Mineração subterrânea','Operação de compactador de solo (sapin)','Esvaziamento de biodigestores'
];

// ========================================================
// STATE
// ========================================================
let state = {
  companies: [],
  currentCompany: null,
  riskData: {},
  epiData: {},
  trainingData: {},
  customTrainings: [],
  periculosidadeData: {},
  aposentadoriaData: {},
  formFields: {},
  responsavel: '',
  signature: ''
};

const STORAGE_PREFIX = 'cg_';

function loadCompanies() {
  const raw = localStorage.getItem(STORAGE_PREFIX + 'companies');
  return raw ? JSON.parse(raw) : [];
}

function saveCompanies(companies) {
  localStorage.setItem(STORAGE_PREFIX + 'companies', JSON.stringify(companies));
}

function checklistKey(company, setor, cargo) {
  return STORAGE_PREFIX + 'cl_' + btoa(unescape(encodeURIComponent(company + '|' + setor + '|' + cargo)));
}

function saveChecklist() {
  const setor = document.getElementById('setorSelect').value;
  const cargo = document.getElementById('cargoSelect').value;
  if (!state.currentCompany) return;

  const data = {
    riskData: state.riskData,
    epiData: state.epiData,
    trainingData: state.trainingData,
    customTrainings: state.customTrainings,
    periculosidadeData: state.periculosidadeData,
    aposentadoriaData: state.aposentadoriaData,
    responsavel: document.getElementById('responsavelSelect').value,
    signature: getSignatureData(),
    formFields: collectFormFields()
  };

  const key = checklistKey(state.currentCompany, setor || '_', cargo || '_');
  localStorage.setItem(key, JSON.stringify(data));
}

function loadChecklist() {
  const setor = document.getElementById('setorSelect').value;
  const cargo = document.getElementById('cargoSelect').value;
  if (!state.currentCompany) return null;
  const key = checklistKey(state.currentCompany, setor || '_', cargo || '_');
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

function collectFormFields() {
  const fields = {};
  ['dataVisita','dataVencExtintores','funcionario','local',
   'peDireito','piso','telhado','ventilacao','iluminacao','paredes',
   'atribuicoes','obsGerais'].forEach(id => {
    const el = document.getElementById(id);
    if (el) fields[id] = el.value;
  });
  const rad = document.querySelector('input[name="adicional"]:checked');
  fields.adicional = rad ? rad.value : '';
  fields.setor = document.getElementById('setorSelect').value;
  fields.cargo = document.getElementById('cargoSelect').value;
  return fields;
}

function restoreFormFields(fields) {
  if (!fields) return;
  Object.entries(fields).forEach(([id, val]) => {
    if (id === 'adicional') {
      const r = document.querySelector(`input[name="adicional"][value="${val}"]`);
      if (r) r.checked = true;
    } else if (id === 'setor' || id === 'cargo') {
      // handled separately
    } else {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }
  });
}

// ========================================================
// RENDER: RISKS
// ========================================================
function renderRisks() {
  const container = document.getElementById('risksContainer');
  container.innerHTML = '';

  Object.entries(RISKS).forEach(([catKey, cat]) => {
    const catDiv = document.createElement('div');
    catDiv.className = 'risk-category';

    const header = document.createElement('div');
    header.className = `risk-category-header risk-type-${cat.type}`;
    header.textContent = cat.label;
    catDiv.appendChild(header);

    cat.items.forEach((item, idx) => {
      const key = `${catKey}_${idx}`;
      const rd = state.riskData[key] || {};

      const row = document.createElement('div');
      row.className = 'risk-item';
      row.dataset.type = cat.type;
      row.dataset.key = key;
      if (rd.checked) row.classList.add('active');
      if (rd.frequency) row.classList.add('has-freq');
      if (rd.photo) row.classList.add('has-photo');
      if (rd.notes) row.classList.add('has-notes');
      if (rd.checked && rd.desc) row.classList.add('complete');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!rd.checked;
      cb.addEventListener('change', () => {
        if (!state.riskData[key]) state.riskData[key] = {};
        state.riskData[key].checked = cb.checked;
        row.classList.toggle('active', cb.checked);
        if (cb.checked) {
          openRiskModal(key, item);
        }
        updateDots(row, key);
      });

      const label = document.createElement('span');
      label.className = 'risk-item-label';
      label.textContent = item;

      const icons = document.createElement('span');
      icons.className = 'risk-item-icons';

      const badgeFreq = document.createElement('span');
      badgeFreq.className = 'badge-freq';
      badgeFreq.textContent = rd.frequency || '';

      const dotDone = document.createElement('span');
      dotDone.className = 'dot-done';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'icon-btn';
      btnEdit.title = 'Editar detalhes';
      btnEdit.textContent = '✏️';
      btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        openRiskModal(key, item);
      });

      icons.append(badgeFreq, dotDone, btnEdit);
      row.append(cb, label, icons);
      catDiv.appendChild(row);
    });

    container.appendChild(catDiv);
  });
}

function updateDots(row, key) {
  const rd = state.riskData[key] || {};
  row.classList.toggle('active', !!rd.checked);
  row.classList.toggle('has-freq', !!rd.frequency);
  row.classList.toggle('has-photo', !!rd.photo);
  row.classList.toggle('has-notes', !!rd.notes);
  row.classList.toggle('complete', !!(rd.checked && rd.desc));

  const badge = row.querySelector('.badge-freq');
  if (badge) badge.textContent = rd.frequency === 'outra' ? (rd.freqOther || 'Outra') : (rd.frequency || '');
}

// ========================================================
// RENDER: EPI
// ========================================================
function renderEpis() {
  const container = document.getElementById('epiContainer');
  container.innerHTML = '';

  EPIS.forEach((name, idx) => {
    const ed = state.epiData[idx] || {};

    const item = document.createElement('label');
    item.className = 'epi-item';
    if (ed.checked) item.classList.add('checked');
    if (ed.photo) item.classList.add('has-photo');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!ed.checked;
    cb.addEventListener('change', () => {
      if (!state.epiData[idx]) state.epiData[idx] = {};
      state.epiData[idx].checked = cb.checked;
      item.classList.toggle('checked', cb.checked);
    });

    const span = document.createElement('span');
    span.textContent = name;

    const photoBtn = document.createElement('button');
    photoBtn.className = 'epi-photo-btn';
    photoBtn.type = 'button';
    photoBtn.textContent = '📷';
    photoBtn.title = 'Foto do C.A.';
    photoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEpiModal(idx, name);
    });

    const dot = document.createElement('span');
    dot.className = 'dot-done-epi';

    item.append(cb, span, photoBtn, dot);
    container.appendChild(item);
  });
}

// ========================================================
// RENDER: TRAININGS
// ========================================================
function renderTrainings() {
  const container = document.getElementById('trainingContainer');
  container.innerHTML = '';

  const allTrainings = [...TRAININGS, ...state.customTrainings.map(t => t.name)];

  allTrainings.forEach((name, idx) => {
    const isCustom = idx >= TRAININGS.length;
    const isChecked = isCustom
      ? state.customTrainings[idx - TRAININGS.length]?.checked
      : state.trainingData[idx];

    const item = document.createElement('label');
    item.className = 'training-item' + (isCustom ? ' custom' : '');
    if (isChecked) item.classList.add('checked');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!isChecked;
    cb.addEventListener('change', () => {
      if (isCustom) {
        state.customTrainings[idx - TRAININGS.length].checked = cb.checked;
      } else {
        state.trainingData[idx] = cb.checked;
      }
      item.classList.toggle('checked', cb.checked);
    });

    const span = document.createElement('span');
    span.textContent = name;

    item.append(cb, span);

    if (isCustom) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-training';
      removeBtn.type = 'button';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.customTrainings.splice(idx - TRAININGS.length, 1);
        renderTrainings();
      });
      item.appendChild(removeBtn);
    }

    container.appendChild(item);
  });
}

// ========================================================
// RENDER: PERICULOSIDADE / APOSENTADORIA
// ========================================================
function renderSelectableGrid(containerId, items, dataObj) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  items.forEach((name, idx) => {
    const d = dataObj[idx] || {};

    const item = document.createElement('div');
    item.className = 'selectable-item';
    if (d.checked) item.classList.add('active');
    if (d.checked && (d.notes || d.photo)) item.classList.add('complete');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!d.checked;
    cb.addEventListener('change', () => {
      dataObj[idx] = dataObj[idx] || {};
      dataObj[idx].checked = cb.checked;
      item.classList.toggle('active', cb.checked);
      if (cb.checked) {
        openSelectableModal(containerId, idx, name, dataObj);
      }
    });

    const span = document.createElement('span');
    span.textContent = name;

    const dot = document.createElement('span');
    dot.className = 'dot-done';

    const btn = document.createElement('button');
    btn.className = 'expand-btn';
    btn.type = 'button';
    btn.textContent = '✏️';
    btn.addEventListener('click', () => {
      openSelectableModal(containerId, idx, name, dataObj);
    });

    item.append(cb, span, dot, btn);
    container.appendChild(item);
  });
}

// ========================================================
// MODALS
// ========================================================
let currentModalTarget = null;

function openRiskModal(key, title) {
  currentModalTarget = { type: 'risk', key };
  const rd = state.riskData[key] || {};

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').value = rd.desc || '';
  document.getElementById('modalNotes').value = rd.notes || '';
  document.getElementById('modalFrequency').value = rd.frequency || '';
  document.getElementById('modalFreqOther').value = rd.freqOther || '';
  document.getElementById('modalFreqOther').style.display = rd.frequency === 'outra' ? '' : 'none';

  const preview = document.getElementById('modalPhotoPreview');
  preview.innerHTML = rd.photo ? `<img src="${rd.photo}">` : '';
  document.getElementById('modalPhoto').value = '';

  document.getElementById('modal').style.display = 'flex';
}

function openSelectableModal(containerId, idx, title, dataObj) {
  currentModalTarget = { type: 'selectable', containerId, idx, dataObj };
  const d = dataObj[idx] || {};

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').value = d.desc || '';
  document.getElementById('modalNotes').value = d.notes || '';
  document.getElementById('modalFrequency').value = d.frequency || '';
  document.getElementById('modalFreqOther').value = d.freqOther || '';
  document.getElementById('modalFreqOther').style.display = d.frequency === 'outra' ? '' : 'none';

  const preview = document.getElementById('modalPhotoPreview');
  preview.innerHTML = d.photo ? `<img src="${d.photo}">` : '';
  document.getElementById('modalPhoto').value = '';

  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentModalTarget = null;
}

function saveModal() {
  if (!currentModalTarget) return;

  const desc = document.getElementById('modalDesc').value;
  const notes = document.getElementById('modalNotes').value;
  const frequency = document.getElementById('modalFrequency').value;
  const freqOther = document.getElementById('modalFreqOther').value;

  let photo = null;
  const previewImg = document.querySelector('#modalPhotoPreview img');
  if (previewImg) photo = previewImg.src;

  if (currentModalTarget.type === 'risk') {
    const key = currentModalTarget.key;
    state.riskData[key] = { ...state.riskData[key], desc, notes, frequency, freqOther, checked: true };
    if (photo) state.riskData[key].photo = photo;

    const row = document.querySelector(`.risk-item[data-key="${key}"]`);
    if (row) {
      row.querySelector('input[type="checkbox"]').checked = true;
      updateDots(row, key);
    }
  } else if (currentModalTarget.type === 'selectable') {
    const { idx, dataObj, containerId } = currentModalTarget;
    dataObj[idx] = { ...dataObj[idx], desc, notes, frequency, freqOther, checked: true };
    if (photo) dataObj[idx].photo = photo;

    const items = containerId === 'periculosidadeContainer' ? PERICULOSIDADE : APOSENTADORIA;
    renderSelectableGrid(containerId, items, dataObj);
  }

  closeModal();
}

// EPI Modal
let currentEpiIdx = null;

function openEpiModal(idx, name) {
  currentEpiIdx = idx;
  document.getElementById('modalEpiTitle').textContent = name + ' - Foto do C.A.';
  const ed = state.epiData[idx] || {};
  const preview = document.getElementById('modalEpiPhotoPreview');
  preview.innerHTML = ed.photo ? `<img src="${ed.photo}">` : '';
  document.getElementById('modalEpiPhoto').value = '';
  document.getElementById('modalEpi').style.display = 'flex';
}

function closeEpiModal() {
  document.getElementById('modalEpi').style.display = 'none';
  currentEpiIdx = null;
}

function saveEpiModal() {
  if (currentEpiIdx === null) return;
  const previewImg = document.querySelector('#modalEpiPhotoPreview img');
  if (previewImg) {
    if (!state.epiData[currentEpiIdx]) state.epiData[currentEpiIdx] = {};
    state.epiData[currentEpiIdx].photo = previewImg.src;
  }
  renderEpis();
  closeEpiModal();
}

// Photo file handler
function handlePhotoInput(inputId, previewId) {
  document.getElementById(inputId).addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById(previewId).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(file);
  });
}

// Frequency toggle
document.getElementById('modalFrequency').addEventListener('change', function() {
  document.getElementById('modalFreqOther').style.display = this.value === 'outra' ? '' : 'none';
});

// ========================================================
// COMPANY / SECTOR / ROLE
// ========================================================
function renderCompanySelect() {
  const sel = document.getElementById('companySelect');
  const companies = loadCompanies();
  sel.innerHTML = '<option value="">-- Selecione a empresa --</option>';
  companies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function renderSectors() {
  const sel = document.getElementById('setorSelect');
  sel.innerHTML = '<option value="">-- Selecione --</option>';
  const companies = loadCompanies();
  const comp = companies.find(c => c.name === state.currentCompany);
  if (!comp) return;

  const sectors = [...new Set(comp.sectors.map(s => s.name))];
  sectors.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
}

function renderRoles(setor) {
  const sel = document.getElementById('cargoSelect');
  sel.innerHTML = '<option value="">-- Selecione --</option>';
  sel.disabled = !setor;
  if (!setor) return;

  const companies = loadCompanies();
  const comp = companies.find(c => c.name === state.currentCompany);
  if (!comp) return;

  const roles = comp.sectors.filter(s => s.name === setor).flatMap(s => s.roles);
  const unique = [...new Set(roles)];
  unique.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
}

// ========================================================
// IMPORT XLSX/CSV
// ========================================================
document.getElementById('importFile').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;

  const companyName = document.getElementById('companySelect').value || document.getElementById('newCompanyName').value;
  if (!companyName) {
    notify('Selecione ou crie uma empresa antes de importar.', '#e74c3c');
    this.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const companies = loadCompanies();
      let comp = companies.find(c => c.name === companyName);
      if (!comp) {
        comp = { name: companyName, sectors: [] };
        companies.push(comp);
      }

      let imported = 0;
      rows.forEach((row, i) => {
        if (i === 0) return;
        const setor = (row[0] || '').toString().trim();
        const cargo = (row[1] || '').toString().trim();
        if (!setor) return;

        let sec = comp.sectors.find(s => s.name === setor);
        if (!sec) {
          sec = { name: setor, roles: [] };
          comp.sectors.push(sec);
        }
        if (cargo && !sec.roles.includes(cargo)) {
          sec.roles.push(cargo);
        }
        imported++;
      });

      saveCompanies(companies);
      renderCompanySelect();
      document.getElementById('companySelect').value = companyName;
      document.getElementById('btnEnterChecklist').disabled = false;
      state.currentCompany = companyName;
      notify(`Importados ${imported} registros de setores/cargos.`, '#27ae60');
    } catch (err) {
      notify('Erro ao ler planilha: ' + err.message, '#e74c3c');
    }
  };
  reader.readAsArrayBuffer(file);
  this.value = '';
});

// ========================================================
// DUPLICATE CHECK
// ========================================================
function checkDuplicate() {
  const setor = document.getElementById('setorSelect').value;
  const cargo = document.getElementById('cargoSelect').value;
  const func = document.getElementById('funcionario').value.trim();
  if (!func || !setor) return;

  const key = checklistKey(state.currentCompany, setor, cargo || '_');
  const existing = localStorage.getItem(key);
  if (existing) {
    const data = JSON.parse(existing);
    if (data.formFields && data.formFields.funcionario &&
        data.formFields.funcionario.toLowerCase() === func.toLowerCase()) {
      document.getElementById('duplicateAlert').style.display = 'flex';
    }
  }
}

// ========================================================
// SIGNATURE
// ========================================================
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;

function resizeCanvas() {
  const parent = canvas.parentElement;
  if (!parent) return;
  const w = Math.min(600, parent.getBoundingClientRect().width - 20);
  canvas.width = w;
  canvas.height = 150;
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

canvas.addEventListener('mousedown', e => { isDrawing = true; ctx.beginPath(); ctx.moveTo(getPos(e).x, getPos(e).y); });
canvas.addEventListener('mousemove', e => { if (!isDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); });
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseleave', () => isDrawing = false);
canvas.addEventListener('touchstart', e => { e.preventDefault(); isDrawing = true; ctx.beginPath(); ctx.moveTo(getPos(e).x, getPos(e).y); });
canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!isDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); });
canvas.addEventListener('touchend', () => isDrawing = false);

document.getElementById('clearSignature').addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

function getSignatureData() { return canvas.toDataURL(); }

function loadSignature(data) {
  if (!data) return;
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = data;
}

// ========================================================
// INIT & EVENTS
// ========================================================
function init() {
  renderCompanySelect();
  renderRisks();
  renderEpis();
  renderTrainings();
  renderSelectableGrid('periculosidadeContainer', PERICULOSIDADE, state.periculosidadeData);
  renderSelectableGrid('aposentadoriaContainer', APOSENTADORIA, state.aposentadoriaData);
  handlePhotoInput('modalPhoto', 'modalPhotoPreview');
  handlePhotoInput('modalEpiPhoto', 'modalEpiPhotoPreview');
  resizeCanvas();
}

// Company screen
document.getElementById('companySelect').addEventListener('change', function() {
  state.currentCompany = this.value;
  document.getElementById('btnEnterChecklist').disabled = !this.value;
});

document.getElementById('btnNewCompany').addEventListener('click', () => {
  document.getElementById('newCompanyForm').style.display = 'flex';
});

document.getElementById('btnCancelCompany').addEventListener('click', () => {
  document.getElementById('newCompanyForm').style.display = 'none';
  document.getElementById('newCompanyName').value = '';
});

document.getElementById('btnSaveCompany').addEventListener('click', () => {
  const name = document.getElementById('newCompanyName').value.trim();
  if (!name) return;
  const companies = loadCompanies();
  if (companies.find(c => c.name === name)) {
    notify('Empresa já existe!', '#e74c3c');
    return;
  }
  companies.push({ name, sectors: [] });
  saveCompanies(companies);
  renderCompanySelect();
  document.getElementById('companySelect').value = name;
  state.currentCompany = name;
  document.getElementById('btnEnterChecklist').disabled = false;
  document.getElementById('newCompanyForm').style.display = 'none';
  document.getElementById('newCompanyName').value = '';
  notify('Empresa criada!');
});

document.getElementById('btnEnterChecklist').addEventListener('click', () => {
  document.getElementById('screenCompany').classList.remove('active');
  document.getElementById('screenChecklist').classList.add('active');
  document.getElementById('headerCompany').textContent = state.currentCompany;
  renderSectors();
  resizeCanvas();
});

document.getElementById('btnBack').addEventListener('click', () => {
  document.getElementById('screenChecklist').classList.remove('active');
  document.getElementById('screenCompany').classList.add('active');
});

// Sector -> Role
document.getElementById('setorSelect').addEventListener('change', function() {
  renderRoles(this.value);
});

// Duplicate check on funcionario blur
document.getElementById('funcionario').addEventListener('blur', checkDuplicate);

document.getElementById('btnOverwrite').addEventListener('click', () => {
  document.getElementById('duplicateAlert').style.display = 'none';
});

document.getElementById('btnDismissAlert').addEventListener('click', () => {
  document.getElementById('duplicateAlert').style.display = 'none';
  document.getElementById('funcionario').value = '';
});

// Modal events
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalSave').addEventListener('click', saveModal);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});

document.getElementById('modalEpiClose').addEventListener('click', closeEpiModal);
document.getElementById('modalEpiSave').addEventListener('click', saveEpiModal);
document.getElementById('modalEpi').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalEpi')) closeEpiModal();
});

// Add training
document.getElementById('btnAddTraining').addEventListener('click', () => {
  const input = document.getElementById('newTraining');
  const name = input.value.trim();
  if (!name) return;
  state.customTrainings.push({ name, checked: true });
  input.value = '';
  renderTrainings();
});

// Save
document.getElementById('btnSave').addEventListener('click', () => {
  saveChecklist();
  notify('Checklist salvo com sucesso!');
});

// Print
document.getElementById('btnPrint').addEventListener('click', () => window.print());

// Clear
document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('Limpar todo o formulário?')) return;
  state.riskData = {};
  state.epiData = {};
  state.trainingData = {};
  state.customTrainings = [];
  state.periculosidadeData = {};
  state.aposentadoriaData = {};

  document.querySelectorAll('#screenChecklist input[type="text"], #screenChecklist input[type="date"], #screenChecklist textarea').forEach(el => el.value = '');
  document.querySelectorAll('#screenChecklist input[type="radio"]').forEach(el => el.checked = false);
  document.getElementById('responsavelSelect').value = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderRisks();
  renderEpis();
  renderTrainings();
  renderSelectableGrid('periculosidadeContainer', PERICULOSIDADE, state.periculosidadeData);
  renderSelectableGrid('aposentadoriaContainer', APOSENTADORIA, state.aposentadoriaData);
  notify('Formulário limpo!');
});

// Load checklist when cargo changes
document.getElementById('cargoSelect').addEventListener('change', function() {
  const saved = loadChecklist();
  if (saved) {
    state.riskData = saved.riskData || {};
    state.epiData = saved.epiData || {};
    state.trainingData = saved.trainingData || {};
    state.customTrainings = saved.customTrainings || [];
    state.periculosidadeData = saved.periculosidadeData || {};
    state.aposentadoriaData = saved.aposentadoriaData || {};

    restoreFormFields(saved.formFields);
    document.getElementById('responsavelSelect').value = saved.responsavel || '';
    loadSignature(saved.signature);

    renderRisks();
    renderEpis();
    renderTrainings();
    renderSelectableGrid('periculosidadeContainer', PERICULOSIDADE, state.periculosidadeData);
    renderSelectableGrid('aposentadoriaContainer', APOSENTADORIA, state.aposentadoriaData);
  }
});

// Notification
function notify(msg, color = '#27ae60') {
  const el = document.createElement('div');
  el.className = 'notification';
  el.textContent = msg;
  el.style.background = color;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// Resize
window.addEventListener('resize', resizeCanvas);

// Start
init();
