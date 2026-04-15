// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';
let supabaseClient = null;
let currentUser = null;

if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error('Supabase não carregou.');
}

// ==================== ELEMENTOS DOM ====================
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const authMessageDiv = document.getElementById('auth-message');

// ==================== FUNÇÕES DE AUTENTICAÇÃO (INALTERADAS) ====================
function showAuthMessage(message, isError = true) {
  authMessageDiv.textContent = message;
  authMessageDiv.className = `auth-message ${isError ? 'auth-error' : 'auth-success'}`;
  setTimeout(() => {
    authMessageDiv.textContent = '';
    authMessageDiv.className = 'auth-message';
  }, 4000);
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthMessage('Preencha email e senha'); return; }
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;
    showAuthMessage('Login realizado com sucesso!', false);
    await afterLoginSuccess();
  } catch (error) { showAuthMessage('Erro ao entrar: ' + error.message); }
}

async function handleRegister() {
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  if (!email || !password) { showAuthMessage('Preencha email e senha'); return; }
  if (password.length < 6) { showAuthMessage('A senha deve ter pelo menos 6 caracteres'); return; }
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      showAuthMessage('Conta criada! Faça login para continuar.', false);
      document.getElementById('tab-login').click();
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = '';
    } else { showAuthMessage('Erro ao criar conta. Tente novamente.'); }
  } catch (error) { showAuthMessage('Erro ao criar conta: ' + error.message); }
}

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
    currentUser = null;
    authContainer.style.display = 'flex';
    mainContainer.style.display = 'none';
    showAuthMessage('Você saiu do sistema.', false);
  } catch (error) { console.error('Erro ao sair:', error); }
}

async function checkSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (session) {
      currentUser = session.user;
      await afterLoginSuccess();
    } else {
      authContainer.style.display = 'flex';
      mainContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    authContainer.style.display = 'flex';
    mainContainer.style.display = 'none';
  }
}

async function afterLoginSuccess() {
  authContainer.style.display = 'none';
  mainContainer.style.display = 'block';
  const statusEl = document.getElementById('status-nuvem');
  if (statusEl) {
    statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Conectado como ${currentUser.email}`;
    statusEl.className = 'status-badge status-connected';
  }
  await Promise.allSettled([
    carregarCaixa(), carregarServicos(), carregarAgenda(), carregarPiercings(),
    carregarVendasPiercing(), carregarMateriais(), carregarUsosMateriais()
  ]);
  atualizarDashboard();
  await carregarRelatorios();
}

// ==================== ESTADO & CONSTANTES ====================
const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Transferência'];
let appState = { servicos: [], agenda: [], caixa: [], piercings: [], vendasPiercing: [], materiais: [], usosMateriais: [] };
let chartFaturamento = null, chartTipos = null, chartPagamentos = null;

// ==================== UTILITÁRIOS ====================
function formatMoney(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }
function formatDateTime(d) { if (!d) return '-'; const dt = new Date(d); return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; }
function showAlert(msg, type = 'info') {
  const container = document.getElementById('alert-container');
  if (!container) return console.warn('Container de alertas não encontrado');
  const a = document.createElement('div');
  a.className = `alert alert-${type}`;
  a.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${msg}`;
  container.appendChild(a);
  setTimeout(() => a.remove(), 4500);
}
function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// ==================== CARREGAMENTO DE DADOS ====================
async function carregarCaixa() {
  try {
    const { data, error } = await supabaseClient.from('caixa').select('*').order('data', { ascending: false });
    if (error) throw error; appState.caixa = data || []; renderizarCaixa(appState.caixa);
  } catch (e) { showAlert('Erro ao carregar caixa: ' + e.message, 'error'); }
}
async function carregarServicos() {
  try {
    const { data, error } = await supabaseClient.from('servicos').select('*').order('data', { ascending: false });
    if (error) throw error; appState.servicos = data || []; renderizarServicos(appState.servicos);
  } catch (e) { showAlert('Erro ao carregar serviços: ' + e.message, 'error'); }
}
async function carregarAgenda() {
  try {
    const { data, error } = await supabaseClient.from('agenda').select('*').order('data_hora');
    if (error) throw error; appState.agenda = data || []; renderizarAgenda(appState.agenda);
  } catch (e) { showAlert('Erro ao carregar agenda: ' + e.message, 'error'); }
}
async function carregarPiercings() {
  try {
    const { data, error } = await supabaseClient.from('piercings_estoque').select('*').order('nome');
    if (error) throw error; appState.piercings = data || []; renderizarEstoquePiercing(appState.piercings);
  } catch (e) { showAlert('Erro ao carregar piercings: ' + e.message, 'error'); }
}
async function carregarVendasPiercing() {
  try {
    const { data, error } = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data', { ascending: false });
    if (error) throw error; appState.vendasPiercing = data || []; renderizarVendasPiercing(appState.vendasPiercing);
  } catch (e) { showAlert('Erro ao carregar vendas: ' + e.message, 'error'); }
}
async function carregarMateriais() {
  try {
    const { data, error } = await supabaseClient.from('materiais_estoque').select('*').order('nome');
    if (error) throw error; appState.materiais = data || []; renderizarEstoqueMaterial(appState.materiais);
  } catch (e) { showAlert('Erro ao carregar materiais: ' + e.message, 'error'); }
}
async function carregarUsosMateriais() {
  try {
    const { data, error } = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data', { ascending: false });
    if (error) throw error; appState.usosMateriais = data || []; renderizarUsosMateriais(appState.usosMateriais);
  } catch (e) { showAlert('Erro ao carregar usos: ' + e.message, 'error'); }
}

// ==================== RENDERIZAÇÃO ====================
function renderizarCaixa(data) {
  let totalE = 0, totalS = 0;
  const tbody = document.getElementById('caixa-tbody');
  tbody.innerHTML = '';
  if (!data.length) { tbody.innerHTML = `<tr><td colspan="7">Nenhum lançamento</td></tr>`; }
  else {
    data.forEach(l => {
      const ent = +l.entradas || 0, sai = +l.saidas || 0;
      totalE += ent; totalS += sai;
      tbody.innerHTML += `
        <tr>
          <td>${formatDate(l.data)}</td><td>${formatMoney(l.saldo_inicial)}</td>
          <td style="color:#34D399">+${formatMoney(ent)}</td><td style="color:#F87171">-${formatMoney(sai)}</td>
          <td>${formatMoney(l.saldo_final)}</td><td>${l.descricao || '-'}</td>
          <td><button class="btn btn-warning btn-sm" onclick="editarCaixa('${l.id}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="excluirCaixa('${l.id}')">Excluir</button></td>
        </tr>`;
    });
  }
  document.getElementById('caixa-total-entradas').textContent = formatMoney(totalE);
  document.getElementById('caixa-total-saidas').textContent = formatMoney(totalS);
  document.getElementById('caixa-saldo-final').textContent = formatMoney(data.length ? data[0].saldo_final : 0);
}

function renderizarServicos(data) {
  let totalV = 0, totalE = 0, totalR = 0;
  const tbody = document.getElementById('servicos-tbody');
  tbody.innerHTML = '';
  data.forEach(s => {
    const val = +s.valor_total || 0;
    const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : 0;
    const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : val;
    totalV += val; totalE += estudio; totalR += repasse;
    const acoes = s.finalizado === true
      ? `<span class="status-badge status-success">✅ Finalizado</span>`
      : `<button class="btn btn-success btn-sm" onclick="finalizarServico('${s.id}')">✅ Finalizar</button>
         <button class="btn btn-info btn-sm" onclick="remarcarServico('${s.id}')">📅 Remarcar</button>
         <button class="btn btn-danger btn-sm" onclick="excluirServico('${s.id}')">Excluir</button>`;
    tbody.innerHTML += `
      <tr><td>${formatDate(s.data)}</td><td>${s.cliente}</td><td>${s.tatuador_nome}</td><td>${s.tipo}</td>
          <td>${formatMoney(val)}</td><td style="color:#34D399">${formatMoney(repasse)}</td>
          <td>${s.forma_pagamento || '-'}</td><td>${acoes}</td></tr>`;
  });
  document.getElementById('servicos-total-valor').textContent = formatMoney(totalV);
  document.getElementById('servicos-total-estudio').textContent = formatMoney(totalE);
  document.getElementById('servicos-total-repasse').textContent = formatMoney(totalR);
}

function renderizarAgenda(data) {
  const tbody = document.getElementById('agenda-tbody');
  tbody.innerHTML = '';
  if (!data.length) { tbody.innerHTML = `<tr><td colspan="8">Nenhum agendamento</td></tr>`; }
  else {
    data.forEach(a => {
      const statusClass = { Agendado: 'status-warning', Confirmado: 'status-info', Concluído: 'status-success', Cancelado: 'status-danger' }[a.status] || 'status-warning';
      const confirmBtn = a.status === 'Agendado'
        ? `<button class="btn btn-success btn-sm" onclick="confirmarAgendamento('${a.id}')"><i class="fas fa-check"></i> Confirmar</button>` : '';
      tbody.innerHTML += `
        <tr><td>${formatDateTime(a.data_hora)}</td><td>${a.cliente}</td><td>${a.tatuador_nome}</td><td>${a.tipo_servico}</td>
            <td>${formatMoney(a.valor_estimado)}</td><td><span class="status-badge-item ${statusClass}">${a.status}</span></td>
            <td>${a.observacoes || '-'}</td>
            <td>${confirmBtn}<button class="btn btn-warning btn-sm" onclick="editarAgenda('${a.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="excluirAgenda('${a.id}')">Excluir</button></td></tr>`;
    });
  }
}

function renderizarEstoquePiercing(piercings) {
  const tbody = document.getElementById('estoque-piercing-tbody');
  tbody.innerHTML = piercings.map(p => `<tr><td>${p.nome}</td><td>${p.quantidade}</td><td>${formatMoney(p.preco_venda)}</td>
    <td><button class="btn btn-warning btn-sm" onclick="editarPiercing(${p.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirPiercing(${p.id})">Excluir</button></td></tr>`).join('') || `<tr><td colspan="4">Nenhum piercing</td></tr>`;
  let opts = '<option value="">Selecione</option>';
  piercings.forEach(p => { if (p.quantidade > 0) opts += `<option value="${p.id}" data-preco="${p.preco_venda}">${p.nome} - ${formatMoney(p.preco_venda)} (Est: ${p.quantidade})</option>`; });
  document.getElementById('venda-piercing-id').innerHTML = opts;
}

function renderizarVendasPiercing(vendas) {
  const tbody = document.getElementById('vendas-piercing-tbody');
  tbody.innerHTML = vendas.map(v => `<tr><td>${formatDate(v.data)}</td><td>${v.piercing?.nome || '?'}</td><td>${v.quantidade}</td><td>${formatMoney(v.valor_total)}</td><td>${v.cliente || '-'}</td></tr>`).join('') || `<tr><td colspan="5">Nenhuma venda</td></tr>`;
}

function renderizarEstoqueMaterial(materiais) {
  const tbody = document.getElementById('estoque-material-tbody');
  tbody.innerHTML = materiais.map(m => `<tr><td>${m.nome}</td><td>${m.quantidade}</td><td>${formatMoney(m.valor_unitario)}</td>
    <td><button class="btn btn-warning btn-sm" onclick="editarMaterial(${m.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirMaterial(${m.id})">Excluir</button></td></tr>`).join('') || `<tr><td colspan="4">Nenhum material</td></tr>`;
  let opts = '<option value="">Selecione</option>';
  materiais.forEach(m => { if (m.quantidade > 0) opts += `<option value="${m.id}">${m.nome} (${m.quantidade} un.)</option>`; });
  document.getElementById('uso-material-id').innerHTML = opts;
}

function renderizarUsosMateriais(usos) {
  const tbody = document.getElementById('usos-materiais-tbody');
  tbody.innerHTML = usos.map(u => `<tr><td>${formatDate(u.data)}</td><td>${u.material?.nome || '?'}</td><td>${u.quantidade}</td><td>${u.observacao || '-'}</td></tr>`).join('') || `<tr><td colspan="4">Nenhum uso</td></tr>`;
}

// ==================== DASHBOARD & CHARTS ====================
function atualizarDashboard() {
  const totalEnt = appState.caixa.reduce((s, i) => s + (+i.entradas || 0), 0);
  const totalSai = appState.caixa.reduce((s, i) => s + (+i.saidas || 0), 0);
  const saldo = appState.caixa[0]?.saldo_final || 0;
  document.getElementById('saldo-atual').textContent = formatMoney(saldo);
  document.getElementById('total-entradas').textContent = formatMoney(totalEnt);
  document.getElementById('total-saidas').textContent = formatMoney(totalSai);
  document.getElementById('servicos-realizados').textContent = appState.servicos.filter(s => s.finalizado).length;
  const repasseThalia = appState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (+sv.valor_total || 0) * 0.7 : 0), 0);
  document.getElementById('repasse-thalia').textContent = formatMoney(repasseThalia);

  const recentes = appState.servicos.filter(s => !s.finalizado).slice(0, 5);
  document.getElementById('servicos-recentes').innerHTML = recentes.length ? `<ul>${recentes.map(s => `<li>${formatDate(s.data)} - ${s.cliente}: ${formatMoney(s.valor_total)}</li>`).join('')}</ul>` : 'Nenhum';
  const prox = appState.agenda.filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'Cancelado').slice(0, 5);
  document.getElementById('proximos-agendamentos').innerHTML = prox.length ? `<ul>${prox.map(a => `<li>${formatDateTime(a.data_hora)} - ${a.cliente}</li>`).join('')}</ul>` : 'Nenhum';

  if (chartFaturamento) chartFaturamento.destroy();
  const meses = [], valores = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    meses.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
    const soma = appState.servicos.filter(s => new Date(s.data).getMonth() === d.getMonth() && new Date(s.data).getFullYear() === d.getFullYear())
      .reduce((s, sv) => s + (+sv.valor_total || 0), 0);
    valores.push(soma);
  }
  chartFaturamento = new Chart(document.getElementById('chart-faturamento').getContext('2d'), {
    type: 'bar', data: { labels: meses, datasets: [{ label: 'Faturamento', data: valores, backgroundColor: '#818CF8' }] }
  });

  if (chartTipos) chartTipos.destroy();
  const tatuagens = appState.servicos.filter(s => s.tipo === 'Tatuagem').length;
  const piercingsServ = appState.servicos.filter(s => s.tipo === 'Piercing').length;
  chartTipos = new Chart(document.getElementById('chart-tipos').getContext('2d'), {
    type: 'doughnut', data: { labels: ['Tatuagens', 'Piercings'], datasets: [{ data: [tatuagens, piercingsServ], backgroundColor: ['#818CF8', '#C084FC'] }] }
  });

  if (chartPagamentos) chartPagamentos.destroy();
  const pgts = {}; appState.servicos.forEach(s => { if(s.forma_pagamento) pgts[s.forma_pagamento] = (pgts[s.forma_pagamento] || 0) + (+s.valor_total || 0); });
  const pgtLabels = Object.keys(pgts), pgtValues = Object.values(pgts);
  if (pgtLabels.length) {
    chartPagamentos = new Chart(document.getElementById('chart-pagamentos')?.getContext('2d'), {
      type: 'doughnut', data: { labels: pgtLabels, datasets: [{ data: pgtValues, backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'] }] }
    });
  }
}

// ==================== RELATÓRIOS ====================
async function carregarRelatorios() {
  const fatPorTatuador = {}; appState.servicos.forEach(s => { fatPorTatuador[s.tatuador_nome] = (fatPorTatuador[s.tatuador_nome] || 0) + (+s.valor_total || 0); });
  document.getElementById('faturamento-tatuador').innerHTML = Object.entries(fatPorTatuador).map(([k, v]) => `<div><strong>${k}:</strong> ${formatMoney(v)}</div>`).join('') || 'Sem dados';
  const totalRepThalia = appState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (+sv.valor_total || 0) * 0.7 : 0), 0);
  document.getElementById('relatorio-repasse').innerHTML = `<strong>Total a repassar para Thalia:</strong> ${formatMoney(totalRepThalia)}`;
  const estudioThalia = appState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (+sv.valor_total || 0) * 0.3 : (+sv.valor_total || 0)), 0);
  const totalSaidas = appState.caixa.reduce((s, c) => s + (+c.saidas || 0), 0);
  const lucroLiq = estudioThalia - totalSaidas;
  document.getElementById('relatorio-lucro-liquido').innerHTML = `<strong>Lucro Líquido (Estúdio):</strong> ${formatMoney(lucroLiq)} <small style="color:#9CA3AF">(Receita estúdio - Despesas caixa)</small>`;

  const fatPorPagamento = {}; appState.servicos.forEach(s => { if(s.forma_pagamento) fatPorPagamento[s.forma_pagamento] = (fatPorPagamento[s.forma_pagamento] || 0) + (+s.valor_total || 0); });
  const elRelPag = document.getElementById('relatorio-pagamentos');
  if (elRelPag) elRelPag.innerHTML = Object.entries(fatPorPagamento).map(([k, v]) => `<div><strong>${k}:</strong> ${formatMoney(v)}</div>`).join('') || 'Sem dados';
}

// ==================== CAIXA: ADICIONAR ENTRADA ====================
async function adicionarEntradaCaixa(data, valor, descricao, formaPagamento = 'Não informado') {
  try {
    const { data: ultimo, error: ultimoError } = await supabaseClient.from('caixa').select('saldo_final').order('data', { ascending: false }).limit(1);
    if (ultimoError) throw ultimoError;
    const saldoInicial = ultimo && ultimo.length ? ultimo[0].saldo_final : 0;
    const saldoFinal = saldoInicial + valor;
    const novoLancamento = { data, saldo_inicial: saldoInicial, entradas: valor, saidas: 0, saldo_final: saldoFinal, descricao, forma_pagamento: formaPagamento };
    const { error: insertError } = await supabaseClient.from('caixa').insert([novoLancamento]);
    if (insertError) throw insertError; await carregarCaixa(); return true;
  } catch (e) { showAlert('Erro ao lançar entrada no caixa: ' + e.message, 'error'); return false; }
}

// ==================== REMARCAR SERVIÇO ====================
window.remarcarServico = async (servicoId) => {
  const servico = appState.servicos.find(s => s.id === servicoId);
  if (!servico || servico.finalizado) return showAlert('Serviço inválido ou finalizado.', 'warning');
  const modalId = 'modal-remarcar'; const modal = document.createElement('div');
  modal.id = modalId; modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content"><span class="close-modal" onclick="fecharModal('${modalId}')">&times;</span><h3>Remarcar Serviço</h3>
    <label>Nova Data</label><input type="date" id="nova-data" value="${servico.data.split('T')[0]}" class="form-control">
    <label>Novo Horário</label><input type="time" id="nova-hora" class="form-control">
    <button id="btn-confirmar-remarcacao" class="btn btn-primary mt-2">Confirmar Remarcação</button></div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-confirmar-remarcacao').addEventListener('click', async () => {
    const novaData = document.getElementById('nova-data').value; const novaHora = document.getElementById('nova-hora').value;
    if (!novaData) return showAlert('Informe a nova data', 'error');
    try {
      const desc = `[Remarcado de ${formatDate(servico.data)}${novaHora ? ` às ${novaHora}` : ''}] ${servico.descricao || ''}`;
      const { error } = await supabaseClient.from('servicos').update({ data: novaData, descricao: desc }).eq('id', servicoId);
      if (error) throw error;
      showAlert(`Serviço remarcado para ${formatDate(novaData)}`, 'success'); fecharModal(modalId); await carregarServicos(); atualizarDashboard();
    } catch (e) { showAlert('Erro ao remarcar: ' + e.message, 'error'); }
  });
  modal.style.display = 'block';
};

// ==================== AGENDA: CONFIRMAR + CRIAR SERVIÇO ====================
async function criarServicoDoAgendamento(agendaId) {
  try {
    const { data: agenda, error } = await supabaseClient.from('agenda').select('*').eq('id', agendaId).single();
    if (error) throw error;
    const novoServico = {
      data: agenda.data_hora.split('T')[0], cliente: agenda.cliente, tatuador_nome: agenda.tatuador_nome,
      tipo: agenda.tipo_servico, descricao: agenda.observacoes || `Agendamento confirmado`,
      valor_total: agenda.valor_estimado || 0, forma_pagamento: 'A definir', finalizado: false
    };
    const { error: insertError } = await supabaseClient.from('servicos').insert([novoServico]);
    if (insertError) throw insertError; showAlert(`Serviço para ${agenda.cliente} criado!`, 'success'); await carregarServicos(); atualizarDashboard();
  } catch (e) { showAlert('Erro ao criar serviço: ' + e.message, 'error'); }
}
window.confirmarAgendamento = async (id) => {
  if (confirm('Confirmar este agendamento? Um serviço será criado automaticamente.')) {
    try {
      await supabaseClient.from('agenda').update({ status: 'Confirmado' }).eq('id', id);
      await carregarAgenda(); await criarServicoDoAgendamento(id); atualizarDashboard();
      showAlert('Agendamento confirmado e serviço criado!', 'success');
    } catch (e) { showAlert('Erro ao confirmar: ' + e.message, 'error'); }
  }
};

// ==================== SERVIÇOS: FINALIZAR TRABALHO ====================
window.finalizarServico = async (servicoId) => {
  const servico = appState.servicos.find(s => s.id === servicoId);
  if (!servico || servico.finalizado || !servico.valor_total || servico.valor_total <= 0) return showAlert('Serviço inválido ou valor R$ 0,00.', 'warning');
  if (confirm(`Finalizar trabalho para ${servico.cliente} no valor de ${formatMoney(servico.valor_total)}?`)) {
    const descCaixa = `Serviço finalizado: ${servico.cliente} - ${servico.descricao || servico.tipo}`;
    const sucesso = await adicionarEntradaCaixa(servico.data, servico.valor_total, descCaixa, servico.forma_pagamento);
    if (sucesso) {
      try {
        await supabaseClient.from('servicos').update({ finalizado: true }).eq('id', servicoId);
        showAlert(`Trabalho finalizado! Valor lançado no caixa.`, 'success');
        await carregarServicos(); await carregarRelatorios(); atualizarDashboard();
      } catch (e) { showAlert('Erro ao finalizar: ' + e.message, 'error'); }
    }
  }
};

// ==================== CRUD: CAIXA ====================
window.abrirModalCaixa = async () => {
  const { data } = await supabaseClient.from('caixa').select('saldo_final').order('data', { ascending: false }).limit(1);
  document.getElementById('caixa-id').value = ''; document.getElementById('caixa-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('caixa-saldo-inicial').value = data?.length ? data[0].saldo_final : 0;
  document.getElementById('caixa-entradas').value = 0; document.getElementById('caixa-saidas').value = 0;
  document.getElementById('caixa-descricao').value = ''; document.getElementById('modal-caixa').style.display = 'block';
};
window.salvarCaixa = async () => {
  const id = document.getElementById('caixa-id').value;
  const data = {
    data: document.getElementById('caixa-data').value,
    saldo_inicial: parseFloat(document.getElementById('caixa-saldo-inicial').value) || 0,
    entradas: parseFloat(document.getElementById('caixa-entradas').value) || 0,
    saidas: parseFloat(document.getElementById('caixa-saidas').value) || 0,
    descricao: document.getElementById('caixa-descricao').value
  };
  if (!data.data) return showAlert('Data é obrigatória', 'error');
  data.saldo_final = data.saldo_inicial + data.entradas - data.saidas;
  try {
    let error = id ? (await supabaseClient.from('caixa').update(data).eq('id', id)).error : (await supabaseClient.from('caixa').insert([data])).error;
    if (error) throw error; fecharModal('modal-caixa'); await carregarCaixa(); atualizarDashboard(); showAlert(id ? 'Atualizado' : 'Salvo', 'success');
  } catch (e) { showAlert('Erro ao salvar: ' + e.message, 'error'); }
};
window.editarCaixa = async (id) => {
  const item = appState.caixa.find(c => c.id === id); if (!item) return;
  document.getElementById('caixa-id').value = item.id; document.getElementById('caixa-data').value = item.data;
  document.getElementById('caixa-saldo-inicial').value = item.saldo_inicial; document.getElementById('caixa-entradas').value = item.entradas;
  document.getElementById('caixa-saidas').value = item.saidas; document.getElementById('caixa-descricao').value = item.descricao || '';
  document.getElementById('modal-caixa').style.display = 'block';
};
window.excluirCaixa = async (id) => { if (confirm('Excluir lançamento?')) { try { await supabaseClient.from('caixa').delete().eq('id', id); await carregarCaixa(); atualizarDashboard(); showAlert('Excluído', 'success'); } catch (e) { showAlert('Erro ao excluir', 'error'); } } };
window.filtrarCaixa = () => { const search = document.getElementById('search-caixa').value.toLowerCase(); renderizarCaixa(appState.caixa.filter(i => (i.descricao || '').toLowerCase().includes(search))); };

// ==================== CRUD: SERVIÇOS ====================
window.abrirModalServico = () => {
  document.getElementById('servico-id').value = ''; document.getElementById('servico-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('servico-cliente').value = ''; document.getElementById('servico-valor').value = '';
  document.getElementById('servico-pagamento').innerHTML = '<option value="">Selecione</option>' + FORMAS_PAGAMENTO.map(p => `<option value="${p}">${p}</option>`).join('');
  document.getElementById('modal-servico').style.display = 'block'; calcularRepasse();
};
window.calcularRepasse = () => {
  const val = +document.getElementById('servico-valor').value || 0;
  const tatuador = document.getElementById('servico-tatuador').value;
  document.getElementById('valor-estudio').textContent = formatMoney(tatuador === 'Thalia' ? val * 0.3 : 0);
  document.getElementById('valor-repasse').textContent = formatMoney(tatuador === 'Thalia' ? val * 0.7 : val);
};
window.salvarServico = async () => {
  const id = document.getElementById('servico-id').value;
  const data = {
    data: document.getElementById('servico-data').value, cliente: document.getElementById('servico-cliente').value,
    tatuador_nome: document.getElementById('servico-tatuador').value, tipo: document.getElementById('servico-tipo').value,
    descricao: document.getElementById('servico-descricao').value, valor_total: +document.getElementById('servico-valor').value || 0,
    forma_pagamento: document.getElementById('servico-pagamento').value || 'A definir', finalizado: false
  };
  if (!data.data || !data.cliente) return showAlert('Data e cliente são obrigatórios', 'error');
  try {
    let error = id ? (await supabaseClient.from('servicos').update(data).eq('id', id)).error : (await supabaseClient.from('servicos').insert([data])).error;
    if (error) throw error; fecharModal('modal-servico'); await carregarServicos(); atualizarDashboard(); showAlert(id ? 'Atualizado' : 'Salvo', 'success');
  } catch (e) { showAlert('Erro ao salvar serviço: ' + e.message, 'error'); }
};
window.editarServico = async (id) => {
  const item = appState.servicos.find(s => s.id === id); if (!item || item.finalizado) return showAlert('Serviço inválido ou finalizado.', 'warning');
  document.getElementById('servico-id').value = item.id; document.getElementById('servico-data').value = item.data;
  document.getElementById('servico-cliente').value = item.cliente; document.getElementById('servico-tatuador').value = item.tatuador_nome;
  document.getElementById('servico-tipo').value = item.tipo; document.getElementById('servico-descricao').value = item.descricao || '';
  document.getElementById('servico-valor').value = item.valor_total;
  document.getElementById('servico-pagamento').innerHTML = FORMAS_PAGAMENTO.map(p => `<option value="${p}" ${p === (item.forma_pagamento || 'A definir') ? 'selected' : ''}>${p}</option>`).join('');
  document.getElementById('modal-servico').style.display = 'block'; calcularRepasse();
};
window.excluirServico = async (id) => { if (confirm('Excluir serviço?')) { try { await supabaseClient.from('servicos').delete().eq('id', id); await carregarServicos(); atualizarDashboard(); showAlert('Excluído', 'success'); } catch (e) { showAlert('Erro ao excluir', 'error'); } } };
window.filtrarServicos = () => {
  let f = [...appState.servicos];
  const tat = document.getElementById('filtro-tatuador-servico').value; const tipo = document.getElementById('filtro-tipo-servico').value;
  const pgto = document.getElementById('filtro-pagamento').value; const data = document.getElementById('filtro-data-servico').value;
  const src = document.getElementById('search-servicos').value.toLowerCase();
  if (tat) f = f.filter(s => s.tatuador_nome === tat); if (tipo) f = f.filter(s => s.tipo === tipo);
  if (pgto) f = f.filter(s => s.forma_pagamento === pgto); if (data) f = f.filter(s => s.data === data);
  if (src) f = f.filter(s => s.cliente.toLowerCase().includes(src) || (s.descricao || '').toLowerCase().includes(src));
  renderizarServicos(f);
};
window.limparFiltrosServicos = () => { ['filtro-tatuador-servico', 'filtro-tipo-servico', 'filtro-pagamento', 'filtro-data-servico'].forEach(id => document.getElementById(id).value = ''); document.getElementById('search-servicos').value = ''; renderizarServicos(appState.servicos); };

// ==================== CRUD: AGENDA ====================
window.abrirModalAgendamento = () => { document.getElementById('agenda-id').value = ''; document.getElementById('agenda-data').value = new Date().toISOString().split('T')[0]; document.getElementById('agenda-horario').value = '10:00'; document.getElementById('modal-agenda').style.display = 'block'; };
window.salvarAgenda = async () => {
  const id = document.getElementById('agenda-id').value; const dataHora = `${document.getElementById('agenda-data').value} ${document.getElementById('agenda-horario').value}`;
  const data = { data_hora: dataHora, cliente: document.getElementById('agenda-cliente').value, tatuador_nome: document.getElementById('agenda-tatuador').value, tipo_servico: document.getElementById('agenda-tipo').value, valor_estimado: +document.getElementById('agenda-valor').value || 0, status: document.getElementById('agenda-status').value, observacoes: document.getElementById('agenda-obs').value };
  if (!data.data_hora || !data.cliente) return showAlert('Data/hora e cliente são obrigatórios', 'error');
  try {
    let error = id ? (await supabaseClient.from('agenda').update(data).eq('id', id)).error : (await supabaseClient.from('agenda').insert([data])).error;
    if (error) throw error; fecharModal('modal-agenda'); await carregarAgenda(); atualizarDashboard(); showAlert(id ? 'Atualizado' : 'Salvo', 'success');
  } catch (e) { showAlert('Erro ao salvar agenda: ' + e.message, 'error'); }
};
window.editarAgenda = async (id) => {
  const item = appState.agenda.find(a => a.id === id); if (!item) return;
  const dt = new Date(item.data_hora);
  document.getElementById('agenda-id').value = item.id; document.getElementById('agenda-data').value = dt.toISOString().split('T')[0];
  document.getElementById('agenda-horario').value = dt.toTimeString().slice(0, 5); document.getElementById('agenda-cliente').value = item.cliente;
  document.getElementById('agenda-tatuador').value = item.tatuador_nome; document.getElementById('agenda-tipo').value = item.tipo_servico;
  document.getElementById('agenda-valor').value = item.valor_estimado; document.getElementById('agenda-status').value = item.status;
  document.getElementById('agenda-obs').value = item.observacoes || ''; document.getElementById('modal-agenda').style.display = 'block';
};
window.excluirAgenda = async (id) => { if (confirm('Excluir agendamento?')) { try { await supabaseClient.from('agenda').delete().eq('id', id); await carregarAgenda(); atualizarDashboard(); showAlert('Excluído', 'success'); } catch (e) { showAlert('Erro ao excluir', 'error'); } } };
window.filtrarAgenda = () => {
  let f = [...appState.agenda];
  const tat = document.getElementById('filtro-tatuador-agenda').value; const status = document.getElementById('filtro-status-agenda').value;
  const data = document.getElementById('filtro-data-agenda').value;
  if (tat) f = f.filter(a => a.tatuador_nome === tat); if (status) f = f.filter(a => a.status === status);
  if (data) f = f.filter(a => a.data_hora.startsWith(data)); renderizarAgenda(f);
};
window.filtrarAgendaHoje = () => { document.getElementById('filtro-data-agenda').valueAsDate = new Date(); filtrarAgenda(); };
window.limparFiltrosAgenda = () => { ['filtro-tatuador-agenda', 'filtro-status-agenda'].forEach(id => document.getElementById(id).value = ''); document.getElementById('filtro-data-agenda').value = ''; renderizarAgenda(appState.agenda); };

// ==================== PIERCING & VENDAS ====================
window.abrirModalPiercing = (id = null) => {
  document.getElementById('piercing-id').value = ''; document.getElementById('piercing-nome').value = ''; document.getElementById('piercing-qtd').value = ''; document.getElementById('piercing-preco').value = '';
  if (id) { supabaseClient.from('piercings_estoque').select('*').eq('id', id).single().then(({ data }) => { if (data) { document.getElementById('piercing-id').value = data.id; document.getElementById('piercing-nome').value = data.nome; document.getElementById('piercing-qtd').value = data.quantidade; document.getElementById('piercing-preco').value = data.preco_venda; document.getElementById('modal-piercing').style.display = 'block'; } }); }
  else document.getElementById('modal-piercing').style.display = 'block';
};
window.salvarPiercing = async () => {
  const id = document.getElementById('piercing-id').value; const nome = document.getElementById('piercing-nome').value; const quantidade = parseInt(document.getElementById('piercing-qtd').value) || 0; const preco_venda = parseFloat(document.getElementById('piercing-preco').value) || 0;
  if (!nome) return showAlert('Nome obrigatório', 'error');
  try { id ? await supabaseClient.from('piercings_estoque').update({ nome, quantidade, preco_venda }).eq('id', id) : await supabaseClient.from('piercings_estoque').insert([{ nome, quantidade, preco_venda }]); fecharModal('modal-piercing'); await carregarPiercings(); await carregarVendasPiercing(); showAlert('Piercing salvo', 'success'); } catch (e) { showAlert('Erro ao salvar piercing', 'error'); }
};
window.editarPiercing = (id) => window.abrirModalPiercing(id);
window.excluirPiercing = async (id) => { if (confirm('Excluir piercing?')) { try { await supabaseClient.from('piercings_estoque').delete().eq('id', id); await carregarPiercings(); await carregarVendasPiercing(); showAlert('Excluído', 'success'); } catch (e) { showAlert('Erro ao excluir', 'error'); } } };
window.registrarVendaPiercing = async () => {
  const piercingId = document.getElementById('venda-piercing-id').value; const qtd = parseInt(document.getElementById('venda-qtd').value); const cliente = document.getElementById('venda-cliente').value;
  if (!piercingId || qtd <= 0) return showAlert('Selecione um piercing e quantidade válida', 'error');
  try {
    const { data: piercing } = await supabaseClient.from('piercings_estoque').select('*').eq('id', piercingId).single();
    if (!piercing || piercing.quantidade < qtd) return showAlert('Estoque insuficiente', 'error');
    await supabaseClient.from('piercings_estoque').update({ quantidade: piercing.quantidade - qtd }).eq('id', piercingId);
    await supabaseClient.from('vendas_piercing').insert([{ piercing_id: piercingId, quantidade: qtd, valor_total: qtd * piercing.preco_venda, cliente: cliente || null }]);
    await carregarPiercings(); await carregarVendasPiercing(); document.getElementById('venda-qtd').value = 1; document.getElementById('venda-cliente').value = '';
    showAlert('Venda registrada!', 'success');
  } catch (e) { showAlert('Erro na venda: ' + e.message, 'error'); }
};

// ==================== MATERIAIS & USOS ====================
window.abrirModalMaterial = (id = null) => {
  document.getElementById('material-id').value = ''; document.getElementById('material-nome').value = ''; document.getElementById('material-qtd').value = ''; document.getElementById('material-preco').value = '';
  if (id) { supabaseClient.from('materiais_estoque').select('*').eq('id', id).single().then(({ data }) => { if (data) { document.getElementById('material-id').value = data.id; document.getElementById('material-nome').value = data.nome; document.getElementById('material-qtd').value = data.quantidade; document.getElementById('material-preco').value = data.valor_unitario; document.getElementById('modal-material').style.display = 'block'; } }); }
  else document.getElementById('modal-material').style.display = 'block';
};
window.salvarMaterial = async () => {
  const id = document.getElementById('material-id').value; const nome = document.getElementById('material-nome').value; const quantidade = parseInt(document.getElementById('material-qtd').value) || 0; const valor_unitario = parseFloat(document.getElementById('material-preco').value) || 0;
  if (!nome) return showAlert('Nome obrigatório', 'error');
  try { id ? await supabaseClient.from('materiais_estoque').update({ nome, quantidade, valor_unitario }).eq('id', id) : await supabaseClient.from('materiais_estoque').insert([{ nome, quantidade, valor_unitario }]); fecharModal('modal-material'); await carregarMateriais(); await carregarUsosMateriais(); showAlert('Material salvo', 'success'); } catch (e) { showAlert('Erro ao salvar material', 'error'); }
};
window.editarMaterial = (id) => window.abrirModalMaterial(id);
window.excluirMaterial = async (id) => { if (confirm('Excluir material?')) { try { await supabaseClient.from('materiais_estoque').delete().eq('id', id); await carregarMateriais(); await carregarUsosMateriais(); showAlert('Excluído', 'success'); } catch (e) { showAlert('Erro ao excluir', 'error'); } } };
window.registrarUsoMaterial = async () => {
  const materialId = document.getElementById('uso-material-id').value; const qtd = parseInt(document.getElementById('uso-qtd').value); const obs = document.getElementById('uso-obs').value;
  if (!materialId || qtd <= 0) return showAlert('Selecione um material e quantidade válida', 'error');
  try {
    const { data: material } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
    if (!material || material.quantidade < qtd) return showAlert('Quantidade insuficiente', 'error');
    await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade - qtd }).eq('id', materialId);
    await supabaseClient.from('usos_materiais').insert([{ material_id: materialId, quantidade: qtd, observacao: obs || null }]);
    await carregarMateriais(); await carregarUsosMateriais(); document.getElementById('uso-qtd').value = 1; document.getElementById('uso-obs').value = '';
    showAlert(`Uso de ${qtd} unidade(s) registrado`, 'success');
  } catch (e) { showAlert('Erro ao registrar uso: ' + e.message, 'error'); }
};

// ==================== 💾 BACKUP ====================
window.exportarBackup = async () => {
  try {
    const [servicos, agenda, caixa, piercings, vendas, materiais, usos] = await Promise.all([
      supabaseClient.from('servicos').select('*'), supabaseClient.from('agenda').select('*'), supabaseClient.from('caixa').select('*'),
      supabaseClient.from('piercings_estoque').select('*'), supabaseClient.from('vendas_piercing').select('*'),
      supabaseClient.from('materiais_estoque').select('*'), supabaseClient.from('usos_materiais').select('*')
    ]);
    const backup = { meta: { versao: '2.1.0', data: new Date().toISOString(), exportado: currentUser?.email }, servicos: servicos.data||[], agenda: agenda.data||[], caixa: caixa.data||[], piercings: piercings.data||[], vendas: vendas.data||[], materiais: materiais.data||[], usos: usos.data||[] };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup-dark013-${new Date().toISOString().split('T')[0]}.json`; a.click();
    showAlert('Backup exportado!', 'success');
  } catch (e) { showAlert('Erro ao exportar backup: ' + e.message, 'error'); }
};
window.importarBackup = async (input) => {
  const file = input.files[0]; if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (!backup.servicos && !backup.agenda) throw new Error('Arquivo inválido.');
    if (confirm('Importar backup? Isso pode duplicar dados.')) {
      let count = 0;
      for (const [tabela, dados] of Object.entries(backup)) {
        if (tabela === 'meta' || !Array.isArray(dados)) continue;
        for (const item of dados) { const { id, created_at, updated_at, ...d } = item; await supabaseClient.from(tabela).insert([d]); count++; }
      }
      showAlert(`${count} registros importados. Recarregando...`, 'success'); setTimeout(() => location.reload(), 1500);
    }
  } catch (e) { showAlert('Erro ao importar: ' + e.message, 'error'); }
  input.value = '';
};

// ==================== EXEMPLOS ====================
window.popularPiercingsExemplo = async () => { if (confirm('Adicionar piercings de exemplo?')) { try { await supabaseClient.from('piercings_estoque').insert([{ nome: 'Nariz Cristal', qtd: 10, preco: 80 }, { nome: 'Septo Aço', qtd: 8, preco: 120 }]); await carregarPiercings(); showAlert('Adicionados!', 'success'); } catch (e) { showAlert(e.message, 'error'); } } };
window.popularMateriaisExemplo = async () => { if (confirm('Adicionar materiais de exemplo?')) { try { await supabaseClient.from('materiais_estoque').insert([{ nome: 'Agulha 1207RL', qtd: 50, preco: 2.5 }, { nome: 'Tinta Preta', qtd: 8, preco: 45 }]); await carregarMateriais(); showAlert('Adicionados!', 'success'); } catch (e) { showAlert(e.message, 'error'); } } };

// ==================== NAVEGAÇÃO E INICIALIZAÇÃO ====================
window.fecharModal = fecharModal;
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
window.sincronizarAgora = async () => { showAlert('Sincronizando...', 'info'); await Promise.allSettled([carregarCaixa(), carregarServicos(), carregarAgenda(), carregarPiercings(), carregarVendasPiercing(), carregarMateriais(), carregarUsosMateriais()]); atualizarDashboard(); await carregarRelatorios(); showAlert('Concluído!', 'success'); };

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) { showAlert('Supabase indisponível.', 'error'); return; }
  const tabLogin = document.getElementById('tab-login'); const tabRegister = document.getElementById('tab-register');
  const loginPanel = document.getElementById('login-form'); const registerPanel = document.getElementById('register-form');
  if (tabLogin) tabLogin.addEventListener('click', () => { tabLogin.classList.add('active'); tabRegister.classList.remove('active'); loginPanel.classList.add('active'); registerPanel.classList.remove('active'); });
  if (tabRegister) tabRegister.addEventListener('click', () => { tabRegister.classList.add('active'); tabLogin.classList.remove('active'); registerPanel.classList.add('active'); loginPanel.classList.remove('active'); });

  document.getElementById('btn-login')?.addEventListener('click', handleLogin);
  document.getElementById('btn-register')?.addEventListener('click', handleRegister);
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
  document.getElementById('btn-add-caixa')?.addEventListener('click', abrirModalCaixa);
  document.getElementById('btn-add-servico')?.addEventListener('click', abrirModalServico);
  document.getElementById('btn-add-agenda')?.addEventListener('click', abrirModalAgendamento);
  document.getElementById('btn-add-piercing')?.addEventListener('click', () => abrirModalPiercing());
  document.getElementById('btn-add-material')?.addEventListener('click', () => abrirModalMaterial());
  document.getElementById('btn-save-caixa')?.addEventListener('click', salvarCaixa);
  document.getElementById('btn-save-servico')?.addEventListener('click', salvarServico);
  document.getElementById('btn-save-agenda')?.addEventListener('click', salvarAgenda);
  document.getElementById('btn-save-piercing')?.addEventListener('click', salvarPiercing);
  document.getElementById('btn-save-material')?.addEventListener('click', salvarMaterial);
  document.getElementById('btn-registrar-venda')?.addEventListener('click', registrarVendaPiercing);
  document.getElementById('btn-registrar-uso')?.addEventListener('click', registrarUsoMaterial);
  document.getElementById('servico-valor')?.addEventListener('input', calcularRepasse);
  document.getElementById('servico-tatuador')?.addEventListener('change', calcularRepasse);
  
  document.querySelectorAll('.nav button').forEach(btn => btn.addEventListener('click', () => {
    let id = btn.getAttribute('data-section');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (id === 'dashboard') atualizarDashboard();
    if (id === 'relatorios') carregarRelatorios();
  }));

  await checkSession();
});