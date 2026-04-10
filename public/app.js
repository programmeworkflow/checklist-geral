// ========================================================
// DATA
// ========================================================
const RISKS = {
  accident: {
    label: 'Acidentes', type: 'accident',
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
    label: 'Biológicos', type: 'biological',
    items: [
      'Água parada / Parasitas / Insetos','Contato com cadáveres',
      'Contato com material infecto-contagiantes','Contato com pacientes possivelmente infectados',
      'Limpeza de estábulos de animais','Manipulação de alimentos',
      'Recolhimento de lixo público (Qtd. pessoas locais)','Vírus / Bactérias / Fungos / Protozoários'
    ]
  },
  ergonomic: {
    label: 'AEP – Avaliação Ergonômica Preliminar', type: 'ergonomic',
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
    label: 'Físicos', type: 'physical',
    items: [
      'Calor por fonte natural (cabine de veículos)','Exposição a calor (gerado por fonte artificial)',
      'Exposição ao frio (câmaras frias)','Exposição aos raios solares / radiação ultravioleta',
      'Radiação ionizante','Realiza Raio-X (ou exp. a raios alfa, beta ou gama)',
      'Ruído contínuo e/ou intermitente (quantitativo)','Ruído qualitativo (abaixo do nível de ação)',
      'Umidade / contato com água de forma habitual','Vibração – VCI','Vibração – VMB'
    ]
  },
  chemical: {
    label: 'Químicos', type: 'chemical',
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

const PERICULOSIDADE = ['Explosivos','Inflamáveis','Segurança patrimonial','Eletricidade','Motocicletas'];
const APOSENTADORIA = ['Mineração subterrânea','Operação de compactador de solo (sapin)','Esvaziamento de biodigestores'];

// ========================================================
// STATE
// ========================================================
var state = {
  currentCompany: null,
  riskData: {},
  epiData: {},
  trainingData: {},
  customTrainings: [],
  periculosidadeData: {},
  aposentadoriaData: {}
};

var STORAGE_PREFIX = 'cg_';

// Safe base64 for unicode strings
function safeB64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(_, p1) {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

function loadCompanies() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'companies')) || []; }
  catch(e) { return []; }
}

function saveCompanies(c) {
  localStorage.setItem(STORAGE_PREFIX + 'companies', JSON.stringify(c));
}

function clKey(company, setor, cargo) {
  return STORAGE_PREFIX + 'cl_' + safeB64(company + '|' + (setor||'_') + '|' + (cargo||'_'));
}

function saveChecklist() {
  if (!state.currentCompany) return;
  var s = document.getElementById('setorSelect').value;
  var c = document.getElementById('cargoSelect').value;
  var data = {
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
  localStorage.setItem(clKey(state.currentCompany, s, c), JSON.stringify(data));
}

function loadChecklist() {
  if (!state.currentCompany) return null;
  var s = document.getElementById('setorSelect').value;
  var c = document.getElementById('cargoSelect').value;
  try { return JSON.parse(localStorage.getItem(clKey(state.currentCompany, s, c))); }
  catch(e) { return null; }
}

function collectFormFields() {
  var fields = {};
  ['dataVisita','dataVencExtintores','funcionario','local',
   'peDireito','piso','telhado','ventilacao','iluminacao','paredes',
   'atribuicoes','obsGerais'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) fields[id] = el.value;
  });
  var rad = document.querySelector('input[name="adicional"]:checked');
  fields.adicional = rad ? rad.value : '';
  fields.setor = document.getElementById('setorSelect').value;
  fields.cargo = document.getElementById('cargoSelect').value;
  return fields;
}

function restoreFormFields(fields) {
  if (!fields) return;
  Object.keys(fields).forEach(function(id) {
    var val = fields[id];
    if (id === 'adicional') {
      var r = document.querySelector('input[name="adicional"][value="' + val + '"]');
      if (r) { r.checked = true; updateRadioStyles(); }
    } else if (id !== 'setor' && id !== 'cargo') {
      var el = document.getElementById(id);
      if (el) el.value = val;
    }
  });
}

// ========================================================
// RADIO STYLES (replace :has() for compat)
// ========================================================
function updateRadioStyles() {
  document.querySelectorAll('.radio-label').forEach(function(lbl) {
    var inp = lbl.querySelector('input[type="radio"]');
    lbl.classList.toggle('selected', inp && inp.checked);
  });
}

document.getElementById('adicionalGroup').addEventListener('click', function(e) {
  var label = e.target.closest('.radio-label');
  if (!label) return;
  var inp = label.querySelector('input[type="radio"]');
  if (inp) { inp.checked = true; updateRadioStyles(); }
});

// ========================================================
// RENDER: RISKS
// ========================================================
function renderRisks() {
  var container = document.getElementById('risksContainer');
  container.innerHTML = '';

  Object.keys(RISKS).forEach(function(catKey) {
    var cat = RISKS[catKey];
    var catDiv = document.createElement('div');
    catDiv.className = 'risk-category';

    var header = document.createElement('div');
    header.className = 'risk-category-header risk-type-' + cat.type;
    header.textContent = cat.label;
    catDiv.appendChild(header);

    cat.items.forEach(function(item, idx) {
      var key = catKey + '_' + idx;
      var rd = state.riskData[key] || {};

      var row = document.createElement('div');
      row.className = 'risk-item';
      row.setAttribute('data-type', cat.type);
      row.setAttribute('data-key', key);
      if (rd.checked) row.classList.add('active');
      if (rd.frequency) row.classList.add('has-freq');
      if (rd.checked && rd.desc) row.classList.add('complete');

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'risk-cb';
      cb.checked = !!rd.checked;

      cb.addEventListener('change', (function(k, itm, r, c) {
        return function() {
          if (c.checked) {
            if (!state.riskData[k]) state.riskData[k] = {};
            state.riskData[k].checked = true;
            r.classList.add('active');
            openRiskModal(k, itm);
          } else {
            if (state.riskData[k]) state.riskData[k].checked = false;
            r.classList.remove('active', 'complete', 'has-freq');
          }
          refreshDots(r, k);
        };
      })(key, item, row, cb));

      var label = document.createElement('span');
      label.className = 'risk-item-label';
      label.textContent = item;

      var icons = document.createElement('span');
      icons.className = 'risk-item-icons';

      var badge = document.createElement('span');
      badge.className = 'badge-freq';
      badge.textContent = formatFreq(rd);

      var dot = document.createElement('span');
      dot.className = 'dot-done';

      var btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'icon-btn';
      btnEdit.textContent = '✏️';

      btnEdit.addEventListener('click', (function(k, itm) {
        return function(e) { e.stopPropagation(); openRiskModal(k, itm); };
      })(key, item));

      icons.appendChild(badge);
      icons.appendChild(dot);
      icons.appendChild(btnEdit);
      row.appendChild(cb);
      row.appendChild(label);
      row.appendChild(icons);
      catDiv.appendChild(row);
    });

    container.appendChild(catDiv);
  });
}

function formatFreq(rd) {
  if (!rd || !rd.frequency) return '';
  if (rd.frequency === 'outra') return rd.freqOther || 'Outra';
  return rd.frequency.charAt(0).toUpperCase() + rd.frequency.slice(1);
}

function refreshDots(row, key) {
  var rd = state.riskData[key] || {};
  row.classList.toggle('active', !!rd.checked);
  row.classList.toggle('has-freq', !!rd.frequency);
  row.classList.toggle('complete', !!(rd.checked && rd.desc));
  var badge = row.querySelector('.badge-freq');
  if (badge) badge.textContent = formatFreq(rd);
}

// ========================================================
// RENDER: EPI (using div instead of label)
// ========================================================
function renderEpis() {
  var container = document.getElementById('epiContainer');
  container.innerHTML = '';

  EPIS.forEach(function(name, idx) {
    var ed = state.epiData[idx] || {};

    var item = document.createElement('div');
    item.className = 'epi-item';
    if (ed.checked) item.classList.add('checked');
    if (ed.photo) item.classList.add('has-photo');

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'epi-cb';
    cb.checked = !!ed.checked;

    cb.addEventListener('change', (function(i, it) {
      return function() {
        if (!state.epiData[i]) state.epiData[i] = {};
        state.epiData[i].checked = this.checked;
        it.classList.toggle('checked', this.checked);
      };
    })(idx, item));

    var span = document.createElement('span');
    span.className = 'epi-item-name';
    span.textContent = name;

    var photoBtn = document.createElement('button');
    photoBtn.type = 'button';
    photoBtn.className = 'epi-photo-btn';
    photoBtn.textContent = '📷';

    photoBtn.addEventListener('click', (function(i, n) {
      return function(e) { e.stopPropagation(); openEpiModal(i, n); };
    })(idx, name));

    var dot = document.createElement('span');
    dot.className = 'dot-done-epi';

    item.appendChild(cb);
    item.appendChild(span);
    item.appendChild(photoBtn);
    item.appendChild(dot);
    container.appendChild(item);
  });
}

// ========================================================
// RENDER: TRAININGS
// ========================================================
function renderTrainings() {
  var container = document.getElementById('trainingContainer');
  container.innerHTML = '';

  var all = TRAININGS.slice();
  state.customTrainings.forEach(function(t) { all.push(t.name); });

  all.forEach(function(name, idx) {
    var isCustom = idx >= TRAININGS.length;
    var isChecked = isCustom
      ? (state.customTrainings[idx - TRAININGS.length] || {}).checked
      : state.trainingData[idx];

    var item = document.createElement('div');
    item.className = 'training-item' + (isCustom ? ' custom' : '');
    if (isChecked) item.classList.add('checked');

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'training-cb';
    cb.checked = !!isChecked;

    cb.addEventListener('change', (function(i, ic, it) {
      return function() {
        if (ic) {
          state.customTrainings[i - TRAININGS.length].checked = this.checked;
        } else {
          state.trainingData[i] = this.checked;
        }
        it.classList.toggle('checked', this.checked);
      };
    })(idx, isCustom, item));

    var span = document.createElement('span');
    span.textContent = name;

    item.appendChild(cb);
    item.appendChild(span);

    if (isCustom) {
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-training';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', (function(i) {
        return function(e) {
          e.stopPropagation();
          state.customTrainings.splice(i - TRAININGS.length, 1);
          renderTrainings();
        };
      })(idx));
      item.appendChild(removeBtn);
    }

    container.appendChild(item);
  });
}

// ========================================================
// RENDER: SELECTABLE GRID
// ========================================================
function renderSelectableGrid(containerId, items, dataObj) {
  var container = document.getElementById(containerId);
  container.innerHTML = '';

  items.forEach(function(name, idx) {
    var d = dataObj[idx] || {};

    var item = document.createElement('div');
    item.className = 'selectable-item';
    if (d.checked) item.classList.add('active');
    if (d.checked && (d.notes || d.photo)) item.classList.add('complete');

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'selectable-cb';
    cb.checked = !!d.checked;

    cb.addEventListener('change', (function(cid, i, n, obj, it) {
      return function() {
        obj[i] = obj[i] || {};
        obj[i].checked = this.checked;
        it.classList.toggle('active', this.checked);
        if (this.checked) openSelectableModal(cid, i, n, obj);
      };
    })(containerId, idx, name, dataObj, item));

    var span = document.createElement('span');
    span.className = 'selectable-item-name';
    span.textContent = name;

    var dot = document.createElement('span');
    dot.className = 'dot-done';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'expand-btn';
    btn.textContent = '✏️';

    btn.addEventListener('click', (function(cid, i, n, obj) {
      return function(e) { e.stopPropagation(); openSelectableModal(cid, i, n, obj); };
    })(containerId, idx, name, dataObj));

    item.appendChild(cb);
    item.appendChild(span);
    item.appendChild(dot);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

// ========================================================
// MODALS
// ========================================================
var currentModalTarget = null;

function openModal() {
  document.getElementById('modal').style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.body.classList.remove('modal-open');
  currentModalTarget = null;
}

function openRiskModal(key, title) {
  currentModalTarget = { type: 'risk', key: key };
  var rd = state.riskData[key] || {};

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').value = rd.desc || '';
  document.getElementById('modalNotes').value = rd.notes || '';
  document.getElementById('modalFrequency').value = rd.frequency || '';
  document.getElementById('modalFreqOther').value = rd.freqOther || '';
  document.getElementById('modalFreqOther').style.display = rd.frequency === 'outra' ? 'block' : 'none';
  document.getElementById('modalPhotoPreview').innerHTML = rd.photo ? '<img src="' + rd.photo + '">' : '';
  document.getElementById('modalPhoto').value = '';
  openModal();
}

function openSelectableModal(containerId, idx, title, dataObj) {
  currentModalTarget = { type: 'selectable', containerId: containerId, idx: idx, dataObj: dataObj };
  var d = dataObj[idx] || {};

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').value = d.desc || '';
  document.getElementById('modalNotes').value = d.notes || '';
  document.getElementById('modalFrequency').value = d.frequency || '';
  document.getElementById('modalFreqOther').value = d.freqOther || '';
  document.getElementById('modalFreqOther').style.display = d.frequency === 'outra' ? 'block' : 'none';
  document.getElementById('modalPhotoPreview').innerHTML = d.photo ? '<img src="' + d.photo + '">' : '';
  document.getElementById('modalPhoto').value = '';
  openModal();
}

function saveModal() {
  if (!currentModalTarget) return;

  var desc = document.getElementById('modalDesc').value;
  var notes = document.getElementById('modalNotes').value;
  var frequency = document.getElementById('modalFrequency').value;
  var freqOther = document.getElementById('modalFreqOther').value;

  var photo = null;
  var img = document.querySelector('#modalPhotoPreview img');
  if (img) photo = img.src;

  if (currentModalTarget.type === 'risk') {
    var key = currentModalTarget.key;
    state.riskData[key] = Object.assign({}, state.riskData[key], {
      desc: desc, notes: notes, frequency: frequency, freqOther: freqOther, checked: true
    });
    if (photo) state.riskData[key].photo = photo;

    var row = document.querySelector('.risk-item[data-key="' + key + '"]');
    if (row) {
      row.querySelector('.risk-cb').checked = true;
      refreshDots(row, key);
    }
  } else if (currentModalTarget.type === 'selectable') {
    var obj = currentModalTarget.dataObj;
    var i = currentModalTarget.idx;
    obj[i] = Object.assign({}, obj[i], {
      desc: desc, notes: notes, frequency: frequency, freqOther: freqOther, checked: true
    });
    if (photo) obj[i].photo = photo;

    var items = currentModalTarget.containerId === 'periculosidadeContainer' ? PERICULOSIDADE : APOSENTADORIA;
    renderSelectableGrid(currentModalTarget.containerId, items, obj);
  }

  closeModal();
}

// EPI Modal
var currentEpiIdx = null;

function openEpiModal(idx, name) {
  currentEpiIdx = idx;
  document.getElementById('modalEpiTitle').textContent = name + ' - Foto C.A.';
  var ed = state.epiData[idx] || {};
  document.getElementById('modalEpiPhotoPreview').innerHTML = ed.photo ? '<img src="' + ed.photo + '">' : '';
  document.getElementById('modalEpiPhoto').value = '';
  document.getElementById('modalEpi').style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeEpiModal() {
  document.getElementById('modalEpi').style.display = 'none';
  document.body.classList.remove('modal-open');
  currentEpiIdx = null;
}

function saveEpiModal() {
  if (currentEpiIdx === null) return;
  var img = document.querySelector('#modalEpiPhotoPreview img');
  if (img) {
    if (!state.epiData[currentEpiIdx]) state.epiData[currentEpiIdx] = {};
    state.epiData[currentEpiIdx].photo = img.src;
  }
  renderEpis();
  closeEpiModal();
}

// Photo handler
function setupPhotoInput(inputId, previewId) {
  document.getElementById(inputId).addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById(previewId).innerHTML = '<img src="' + e.target.result + '">';
    };
    reader.readAsDataURL(file);
  });
}

// Frequency toggle
document.getElementById('modalFrequency').addEventListener('change', function() {
  document.getElementById('modalFreqOther').style.display = this.value === 'outra' ? 'block' : 'none';
});

// ========================================================
// COMPANY / SECTOR / ROLE
// ========================================================
function renderCompanySelect() {
  var sel = document.getElementById('companySelect');
  var companies = loadCompanies();
  sel.innerHTML = '<option value="">-- Selecione a empresa --</option>';
  companies.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function renderSectors() {
  var sel = document.getElementById('setorSelect');
  sel.innerHTML = '<option value="">-- Selecione --</option>';
  var companies = loadCompanies();
  var comp = companies.find(function(c) { return c.name === state.currentCompany; });
  if (!comp) return;

  var seen = {};
  comp.sectors.forEach(function(s) {
    if (seen[s.name]) return;
    seen[s.name] = true;
    var opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });
}

function renderRoles(setor) {
  var sel = document.getElementById('cargoSelect');
  sel.innerHTML = '<option value="">-- Selecione --</option>';
  sel.disabled = !setor;
  if (!setor) return;

  var companies = loadCompanies();
  var comp = companies.find(function(c) { return c.name === state.currentCompany; });
  if (!comp) return;

  var seen = {};
  comp.sectors.forEach(function(s) {
    if (s.name !== setor) return;
    s.roles.forEach(function(r) {
      if (seen[r]) return;
      seen[r] = true;
      var opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}

// ========================================================
// IMPORT
// ========================================================
document.getElementById('importFile').addEventListener('change', function() {
  var file = this.files[0];
  if (!file) return;

  var companyName = document.getElementById('companySelect').value || document.getElementById('newCompanyName').value;
  if (!companyName) {
    notify('Selecione ou crie uma empresa primeiro.', '#e74c3c');
    this.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, { type: 'array' });
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      var companies = loadCompanies();
      var comp = companies.find(function(c) { return c.name === companyName; });
      if (!comp) {
        comp = { name: companyName, sectors: [] };
        companies.push(comp);
      }

      var imported = 0;
      rows.forEach(function(row, i) {
        if (i === 0) return;
        var setor = (row[0] || '').toString().trim();
        var cargo = (row[1] || '').toString().trim();
        if (!setor) return;

        var sec = comp.sectors.find(function(s) { return s.name === setor; });
        if (!sec) {
          sec = { name: setor, roles: [] };
          comp.sectors.push(sec);
        }
        if (cargo && sec.roles.indexOf(cargo) === -1) {
          sec.roles.push(cargo);
        }
        imported++;
      });

      saveCompanies(companies);
      renderCompanySelect();
      document.getElementById('companySelect').value = companyName;
      document.getElementById('btnEnterChecklist').disabled = false;
      state.currentCompany = companyName;
      notify('Importados ' + imported + ' registros.', '#27ae60');
    } catch (err) {
      notify('Erro na planilha: ' + err.message, '#e74c3c');
    }
  };
  reader.readAsArrayBuffer(file);
  this.value = '';
});

// ========================================================
// DUPLICATE CHECK
// ========================================================
function checkDuplicate() {
  var setor = document.getElementById('setorSelect').value;
  var cargo = document.getElementById('cargoSelect').value;
  var func = document.getElementById('funcionario').value.trim();
  if (!func || !setor || !state.currentCompany) return;

  var key = clKey(state.currentCompany, setor, cargo);
  var existing = localStorage.getItem(key);
  if (existing) {
    try {
      var data = JSON.parse(existing);
      if (data.formFields && data.formFields.funcionario &&
          data.formFields.funcionario.toLowerCase() === func.toLowerCase()) {
        document.getElementById('duplicateAlert').style.display = 'flex';
      }
    } catch(e) {}
  }
}

// ========================================================
// SIGNATURE
// ========================================================
var canvas = document.getElementById('signatureCanvas');
var ctx = canvas.getContext('2d');
var isDrawing = false;

function resizeCanvas() {
  if (!document.getElementById('screenChecklist').classList.contains('active')) return;
  var parent = canvas.parentElement;
  if (!parent) return;
  var w = Math.min(600, parent.getBoundingClientRect().width - 20);
  if (w < 100) w = 280;
  canvas.width = w;
  canvas.height = 150;
}

function getPos(e) {
  var rect = canvas.getBoundingClientRect();
  var t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function startDraw(e) {
  isDrawing = true;
  var p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
}

function moveDraw(e) {
  if (!isDrawing) return;
  var p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function endDraw() { isDrawing = false; }

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', endDraw);
canvas.addEventListener('touchstart', function(e) { e.preventDefault(); startDraw(e); }, { passive: false });
canvas.addEventListener('touchmove', function(e) { e.preventDefault(); moveDraw(e); }, { passive: false });
canvas.addEventListener('touchend', endDraw);

document.getElementById('clearSignature').addEventListener('click', function() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function getSignatureData() { return canvas.toDataURL(); }

function loadSignature(data) {
  if (!data) return;
  var img = new Image();
  img.onload = function() { ctx.drawImage(img, 0, 0); };
  img.src = data;
}

// ========================================================
// EVENTS
// ========================================================

// Company
document.getElementById('companySelect').addEventListener('change', function() {
  state.currentCompany = this.value;
  document.getElementById('btnEnterChecklist').disabled = !this.value;
});

document.getElementById('btnNewCompany').addEventListener('click', function() {
  document.getElementById('newCompanyForm').style.display = 'flex';
});

document.getElementById('btnCancelCompany').addEventListener('click', function() {
  document.getElementById('newCompanyForm').style.display = 'none';
  document.getElementById('newCompanyName').value = '';
});

document.getElementById('btnSaveCompany').addEventListener('click', function() {
  var name = document.getElementById('newCompanyName').value.trim();
  if (!name) return;
  var companies = loadCompanies();
  if (companies.find(function(c) { return c.name === name; })) {
    notify('Empresa já existe!', '#e74c3c');
    return;
  }
  companies.push({ name: name, sectors: [] });
  saveCompanies(companies);
  renderCompanySelect();
  document.getElementById('companySelect').value = name;
  state.currentCompany = name;
  document.getElementById('btnEnterChecklist').disabled = false;
  document.getElementById('newCompanyForm').style.display = 'none';
  document.getElementById('newCompanyName').value = '';
  notify('Empresa criada!');
});

document.getElementById('btnEnterChecklist').addEventListener('click', function() {
  document.getElementById('screenCompany').classList.remove('active');
  document.getElementById('screenChecklist').classList.add('active');
  document.getElementById('headerCompany').textContent = state.currentCompany;
  renderSectors();
  setTimeout(resizeCanvas, 100);
});

document.getElementById('btnBack').addEventListener('click', function() {
  document.getElementById('screenChecklist').classList.remove('active');
  document.getElementById('screenCompany').classList.add('active');
});

// Sector -> Role
document.getElementById('setorSelect').addEventListener('change', function() {
  renderRoles(this.value);
});

// Duplicate
document.getElementById('funcionario').addEventListener('blur', checkDuplicate);

document.getElementById('btnOverwrite').addEventListener('click', function() {
  document.getElementById('duplicateAlert').style.display = 'none';
});

document.getElementById('btnDismissAlert').addEventListener('click', function() {
  document.getElementById('duplicateAlert').style.display = 'none';
  document.getElementById('funcionario').value = '';
});

// Modals
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalSave').addEventListener('click', saveModal);
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.getElementById('modalEpiClose').addEventListener('click', closeEpiModal);
document.getElementById('modalEpiSave').addEventListener('click', saveEpiModal);
document.getElementById('modalEpi').addEventListener('click', function(e) {
  if (e.target === this) closeEpiModal();
});

// Training
document.getElementById('btnAddTraining').addEventListener('click', function() {
  var input = document.getElementById('newTraining');
  var name = input.value.trim();
  if (!name) return;
  state.customTrainings.push({ name: name, checked: true });
  input.value = '';
  renderTrainings();
});

// Save
document.getElementById('btnSave').addEventListener('click', function() {
  saveChecklist();
  notify('Checklist salvo!');
});

// Print
document.getElementById('btnPrint').addEventListener('click', function() { window.print(); });

// Clear
document.getElementById('btnClear').addEventListener('click', function() {
  if (!confirm('Limpar todo o formulário?')) return;
  state.riskData = {};
  state.epiData = {};
  state.trainingData = {};
  state.customTrainings = [];
  state.periculosidadeData = {};
  state.aposentadoriaData = {};

  document.querySelectorAll('#screenChecklist input[type="text"], #screenChecklist input[type="date"], #screenChecklist textarea').forEach(function(el) { el.value = ''; });
  document.querySelectorAll('#screenChecklist input[type="radio"]').forEach(function(el) { el.checked = false; });
  updateRadioStyles();
  document.getElementById('responsavelSelect').value = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderAll();
  notify('Formulário limpo!');
});

// Load on cargo change
document.getElementById('cargoSelect').addEventListener('change', function() {
  var saved = loadChecklist();
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
    renderAll();
  }
});

// ========================================================
// INIT
// ========================================================
function renderAll() {
  renderRisks();
  renderEpis();
  renderTrainings();
  renderSelectableGrid('periculosidadeContainer', PERICULOSIDADE, state.periculosidadeData);
  renderSelectableGrid('aposentadoriaContainer', APOSENTADORIA, state.aposentadoriaData);
}

function notify(msg, color) {
  var el = document.createElement('div');
  el.className = 'notification';
  el.textContent = msg;
  el.style.background = color || '#27ae60';
  document.body.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(function() { el.remove(); }, 300);
  }, 2500);
}

window.addEventListener('resize', resizeCanvas);

// Setup
renderCompanySelect();
renderAll();
setupPhotoInput('modalPhoto', 'modalPhotoPreview');
setupPhotoInput('modalEpiPhoto', 'modalEpiPhotoPreview');
resizeCanvas();
