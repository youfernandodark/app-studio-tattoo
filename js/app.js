/**
 *  DARK013TATTOO - Lógica da Aplicação
 * Arquivo: js/app.js
 */

import { CONFIG, validarConfig } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Inicializar Supabase
const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

// ============================================
// 🎨 Elementos da UI (IDs sugeridos para seu HTML)
// ============================================
// Dica: Adicione estes IDs no seu HTML para o JS funcionar
const UI = {
  dashboard: {
    saldo: document.getElementById('dash-saldo'),
    entradas: document.getElementById('dash-entradas'),
    saidas: document.getElementById('dash-saidas'),
    servicosQtd: document.getElementById('dash-servicos-qtd'),
    repasse: document.getElementById('dash-repasse'),
    faturamentoMes: document.getElementById('dash-faturamento-mes'),
  },
  tabelas: {
    servicos: document.getElementById('table-servicos-body'),
    piercings: document.getElementById('table-piercings-body'),
    materiais: document.getElementById('table-materiais-body'),
    agenda: document.getElementById('table-agenda-body'),
    caixa: document.getElementById('table-caixa-body'),
  },
  forms: {
    servico: document.getElementById('form-servico'),
    piercing: document.getElementById('form-piercing'),
    material: document.getElementById('form-material'),
    agendamento: document.getElementById('form-agendamento'),
    caixa: document.getElementById('form-caixa'),
  }
};

// ============================================
// 🚀 Inicialização
// ============================================
async function init() {
  console.log('🚀 Iniciando DARK013TATTOO v' + CONFIG.sistema.versao);
  
  // Validar configuração
  const validacao = validarConfig();
  if (!validacao.ok) {
    alert('⚠️ Configuração incorreta! Verifique o console.');
    return;
  }

  // Configurar Navegação (Abas)
  setupNavegacao();

  // Carregar Dados Iniciais
  await carregarDashboard();
  await carregarServicos();
  await carregarPiercings();
  await carregarMateriais();
  await carregarAgenda();

  // Configurar Eventos de Formulários
  setupFormularios();

  console.log('✅ Sistema pronto!');
}

// ============================================
// 📊 Dashboard
// ============================================
async function carregarDashboard() {
  // 1. Buscar Serviços do Mês
  const primeiroDiaMes = new Date();
  primeiroDiaMes.setDate(1);
  
  const { data: servicos, error: errServ } = await supabase
    .from('servicos')
    .select('valor_total, valor_repasse, tipo')
    .gte('data', primeiroDiaMes.toISOString().split('T')[0]);

  // 2. Buscar Piercings Vendidos
  const { data: piercings, error: errPier } = await supabase
    .from('piercings')
    .select('lucro_total')
    .gt('vendido', 0);

  // 3. Buscar Materiais (Custos)
  const { data: materiais, error: errMat } = await supabase
    .from('materiais')
    .select('valor_estoque') // Custo total investido

  if (errServ || errPier) console.error('Erro no dashboard:', errServ, errPier);

  // Cálculos
  let totalEntradas = 0;
  let totalRepasse = 0;
  let qtdServicos = 0;

  servicos?.forEach(s => {
    totalEntradas += Number(s.valor_total);
    totalRepasse += Number(s.valor_repasse);
    qtdServicos++;
  });

  let totalVendaPiercings = 0;
  piercings?.forEach(p => totalVendaPiercings += Number(p.lucro_total));

  let totalCustoMateriais = 0;
  materiais?.forEach(m => totalCustoMateriais += Number(m.valor_estoque));

  // Atualizar UI
  atualizarTexto(UI.dashboard.entradas, formatMoney(totalEntradas));
  atualizarTexto(UI.dashboard.repasse, formatMoney(totalRepasse));
  atualizarTexto(UI.dashboard.servicosQtd, qtdServicos);
  
  // Lucro Líquido Estimado (Faturamento - Repasse - Materiais)
  const lucroLiquido = (totalEntradas - totalRepasse - totalCustoMateriais) + totalVendaPiercings;
  atualizarTexto(UI.dashboard.faturamentoMes, formatMoney(lucroLiquido));
}

// ============================================
// 🖼️ Tabelas (Serviços)
// ============================================
async function carregarServicos() {
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .order('data', { ascending: false })
    .limit(50);

  if (error) { console.error('Erro ao carregar serviços:', error); return; }

  UI.tabelas.servicos.innerHTML = ''; // Limpar tabela

  data.forEach(item => {
    const valorEstudio = item.valor_total * 0.30;
    const valorRepasse = item.valor_total * 0.70;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(item.data)}</td>
      <td>${item.cliente}</td>
      <td>${item.tatuador}</td>
      <td><span class="badge ${item.tipo}">${item.tipo}</span></td>
      <td>${item.descricao || '-'}</td>
      <td><strong>${formatMoney(item.valor_total)}</strong></td>
      <td class="text-studio">${formatMoney(valorEstudio)}</td>
      <td class="text-repasse">${formatMoney(valorRepasse)}</td>
      <td>${item.forma_pagamento}</td>
      <td>
        <button onclick="deletarServico('${item.id}')" class="btn-delete">🗑️</button>
      </td>
    `;
    UI.tabelas.servicos.appendChild(tr);
  });
}

// ============================================
// 💎 Tabelas (Piercings)
// ============================================
async function carregarPiercings() {
  const { data, error } = await supabase
    .from('piercings')
    .select('*')
    .order('modelo', { ascending: true });

  if (error) return;

  UI.tabelas.piercings.innerHTML = '';

  data.forEach(item => {
    const lucroUnit = item.preco_venda - item.custo_unitario;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.modelo} <small>(${item.local_tipo})</small></td>
      <td>${item.estoque_atual}</td>
      <td>${item.comprado}</td>
      <td>${item.vendido}</td>
      <td>${formatMoney(item.custo_unitario)}</td>
      <td>${formatMoney(item.preco_venda)}</td>
      <td>${formatMoney(lucroUnit)}</td>
      <td><strong>${formatMoney(lucroUnit * item.vendido)}</strong></td>
      <td>
        <button onclick="abrirMovimentacaoPiercing('${item.id}')" class="btn-action">📦</button>
      </td>
    `;
    UI.tabelas.piercings.appendChild(tr);
  });
}

// ============================================
// 📅 Agendamentos
// ============================================
async function carregarAgenda() {
  const { data, error } = await supabase
    .from('agenda')
    .select('*')
    .gte('data_hora', new Date().toISOString().split('T')[0])
    .order('data_hora', { ascending: true });

  if (error) return;

  UI.tabelas.agenda.innerHTML = '';

  data.forEach(item => {
    const tr = document.createElement('tr');
    // Cor do status
    const statusClass = `status-${item.status.toLowerCase()}`;
    
    tr.innerHTML = `
      <td>${formatDateTime(item.data_hora)}</td>
      <td>${item.cliente}</td>
      <td>${item.tatuador_nome}</td>
      <td>${item.tipo_servico}</td>
      <td>${formatMoney(item.valor_estimado)}</td>
      <td><span class="badge ${statusClass}">${item.status}</span></td>
      <td>${item.observacoes || '-'}</td>
      <td><button onclick="deletarAgendamento('${item.id}')" class="btn-delete">❌</button></td>
    `;
    UI.tabelas.agenda.appendChild(tr);
  });
}

// ============================================
// 🛠️ Funções de Ação (CRUD)
// ============================================

// Salvar Serviço
async function salvarServico(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const novoServico = {
    data: formData.get('data'),
    cliente: formData.get('cliente'),
    tatuador: formData.get('tatuador'),
    tatuador_nome: formData.get('tatuador'), // Redundância para facilitar
    tipo: formData.get('tipo'),
    descricao: formData.get('descricao'),
    valor_total: parseFloat(formData.get('valor')),
    forma_pagamento: formData.get('pagamento'),
    status: 'Concluído'
  };

  const { error } = await supabase.from('servicos').insert([novoServico]);

  if (error) {
    alert('Erro ao salvar: ' + error.message);
  } else {
    alert('✅ Serviço salvo!');
    form.reset();
    fecharModal('modal-servico');
    carregarServicos(); // Atualizar tabela
    carregarDashboard(); // Atualizar números
  }
}

// Salvar Piercing
async function salvarPiercing(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const novoPiercing = {
    modelo: formData.get('modelo'),
    local_tipo: formData.get('local_tipo'),
    estoque_atual: parseInt(formData.get('estoque_inicial')),
    comprado: parseInt(formData.get('estoque_inicial')),
    custo_unitario: parseFloat(formData.get('custo_unitario')),
    preco_venda: parseFloat(formData.get('preco_venda'))
  };

  const { error } = await supabase.from('piercings').insert([novoPiercing]);

  if (error) {
    alert('Erro ao salvar: ' + error.message);
  } else {
    alert('✅ Piercing cadastrado!');
    form.reset();
    fecharModal('modal-piercing');
    carregarPiercings();
  }
}

// Salvar Agendamento
async function salvarAgendamento(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const novoAgendamento = {
    data_hora: `${formData.get('data')}T${formData.get('hora')}`,
    cliente: formData.get('cliente'),
    tatuador_nome: formData.get('tatuador'),
    tipo_servico: formData.get('tipo'),
    valor_estimado: parseFloat(formData.get('valor')),
    status: formData.get('status'),
    observacoes: formData.get('observacoes')
  };

  const { error } = await supabase.from('agenda').insert([novoAgendamento]);

  if (error) {
    alert('Erro ao agendar: ' + error.message);
  } else {
    alert('✅ Agendado!');
    form.reset();
    fecharModal('modal-agendamento');
    carregarAgenda();
  }
}

// ============================================
// 🔧 Utilitários e UI
// ============================================

function setupNavegacao() {
  // Lógica simples para alternar abas se você usar botões de navegação
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = e.target.getAttribute('data-target');
      document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
      document.getElementById(targetId).style.display = 'block';
    });
  });
}

function setupFormularios() {
  if (UI.forms.servico) UI.forms.servico.addEventListener('submit', salvarServico);
  if (UI.forms.piercing) UI.forms.piercing.addEventListener('submit', salvarPiercing);
  if (UI.forms.agendamento) UI.forms.agendamento.addEventListener('submit', salvarAgendamento);
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

function atualizarTexto(elemento, valor) {
  if (elemento) elemento.textContent = valor;
}

// Funções Globais para chamar via HTML (onclick)
window.deletarServico = async (id) => {
  if(confirm('Tem certeza?')) {
    await supabase.from('servicos').delete().eq('id', id);
    carregarServicos();
    carregarDashboard();
  }
};

window.deletarAgendamento = async (id) => {
  if(confirm('Cancelar agendamento?')) {
    await supabase.from('agenda').delete().eq('id', id);
    carregarAgenda();
  }
};

window.fecharModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if(modal) modal.style.display = 'none'; // Ou sua classe de ocultação
};

// Iniciar App
document.addEventListener('DOMContentLoaded', init);
