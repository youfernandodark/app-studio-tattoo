// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou.');
}

// ==================== AUTENTICAÇÃO ====================
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        // Usuário logado
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        await inicializarSistema();
    } else {
        // Não logado
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-content').style.display = 'none';
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Login bem-sucedido
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        await inicializarSistema();
    } catch (error) {
        errorEl.textContent = 'E‑mail ou senha inválidos.';
        console.error('Erro no login:', error);
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    // Recarrega a página para voltar à tela de login
    window.location.reload();
}

// ==================== INICIALIZAÇÃO DO SISTEMA (APÓS LOGIN) ====================
async function inicializarSistema() {
    // Testa conexão com Supabase (já autenticado)
    await testarConexao();
    
    // Configura navegação e eventos
    setupNavigation();
    setupGlobalDelegation();

    // Carrega dados iniciais
    await DataService.loadCaixa(1, 100);
    await DataService.loadServicos(1, 100);
    await DataService.loadAgenda(1, 100);
    await DataService.loadPiercings();
    await DataService.loadVendasPiercing();
    await DataService.loadMateriais();
    await DataService.loadUsosMateriais();
    
    atualizarDashboard();
}

// ==================== UTILITÁRIOS GLOBAIS ====================
const DomUtils = {
    get: (id) => document.getElementById(id),
    setHtml: (id, html) => { const el = DomUtils.get(id); if (el) el.innerHTML = html; },
    setValue: (id, value) => { const el = DomUtils.get(id); if (el) el.value = value; },
    getValue: (id) => DomUtils.get(id)?.value,
    setDisplay: (id, display) => { const el = DomUtils.get(id); if (el) el.style.display = display; },
    clearForm: (formId) => { const form = DomUtils.get(formId); if (form) form.reset(); },
    exists: (id) => !!DomUtils.get(id)
};

const DateUtils = {
    formatDate: (date) => date ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
    formatDateTime: (date) => {
        if (!date) return '-';
        const dt = new Date(date);
        if (isNaN(dt.getTime())) return '-';
        return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    },
    toISOString: (date) => date ? new Date(date).toISOString().split('T')[0] : '',
    nowDate: () => new Date().toISOString().split('T')[0]
};

const MoneyUtils = {
    format: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0),
    parse: (value) => parseFloat(value) || 0
};

const AlertUtils = {
    show: (message, type = 'info') => {
        const container = DomUtils.get('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
        alertDiv.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        container.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 4500);
    }
};

const LoadingUtils = {
    show: (message = 'Carregando...') => {
        let overlay = DomUtils.get('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
            overlay.innerHTML = '<div style="background:#fff; padding:20px; border-radius:8px;"><i class="fas fa-spinner fa-pulse"></i> <span id="loading-message">Carregando...</span></div>';
            document.body.appendChild(overlay);
        }
        overlay.querySelector('#loading-message').innerText = message;
        overlay.style.display = 'flex';
    },
    hide: () => {
        const overlay = DomUtils.get('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
};

const ConfirmModal = {
    _modal: null,
    _resolve: null,
    init: () => {
        if (ConfirmModal._modal) return;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content confirm-modal">
                <h3>Confirmação</h3>
                <p id="confirm-message"></p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="confirm-ok">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        ConfirmModal._modal = modal;
        document.getElementById('confirm-cancel').addEventListener('click', () => ConfirmModal._handle(false));
        document.getElementById('confirm-ok').addEventListener('click', () => ConfirmModal._handle(true));
        window.addEventListener('click', (e) => { if (e.target === modal) ConfirmModal._handle(false); });
    },
    show: (message) => {
        ConfirmModal.init();
        return new Promise((resolve) => {
            ConfirmModal._resolve = resolve;
            document.getElementById('confirm-message').innerText = message;
            ConfirmModal._modal.style.display = 'block';
        });
    },
    _handle: (result) => {
        ConfirmModal._modal.style.display = 'none';
        if (ConfirmModal._resolve) {
            ConfirmModal._resolve(result);
            ConfirmModal._resolve = null;
        }
    }
};

// ==================== ESTADO GLOBAL ====================
const AppState = {
    servicos: [],
    agenda: [],
    caixa: [],
    chartFaturamento: null,
    chartTipos: null,
    paginacao: {
        caixa: { pagina: 1, itensPorPagina: 10 },
        servicos: { pagina: 1, itensPorPagina: 10 },
        agenda: { pagina: 1, itensPorPagina: 10 }
    }
};

// ==================== SERVIÇO DE DADOS ====================
const DataService = {
    async fetchTable(table, orderBy = null, ascending = true, limit = null, offset = 0) {
        let query = supabaseClient.from(table).select('*', { count: 'exact' });
        if (orderBy) query = query.order(orderBy, { ascending });
        if (limit) query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) throw error;
        return { data: data || [], count };
    },

    async fetchAll(table, orderBy = null, ascending = true) {
        let query = supabaseClient.from(table).select('*');
        if (orderBy) query = query.order(orderBy, { ascending });
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async saveRecord(table, record, id = null) {
        let error;
        if (id) {
            ({ error } = await supabaseClient.from(table).update(record).eq('id', id));
        } else {
            ({ error } = await supabaseClient.from(table).insert([record]));
        }
        if (error) throw error;
    },

    async deleteRecord(table, id) {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;
    },

    async loadAllServicos() {
        try { AppState.servicos = await this.fetchAll('servicos', 'data', false); } 
        catch (e) { console.error(e); }
    },

    async loadAllCaixa() {
        try { AppState.caixa = await this.fetchAll('caixa', 'data', false); } 
        catch (e) { console.error(e); }
    },

    async loadCaixa(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const { data, count } = await this.fetchTable('caixa', 'data', false, itensPorPagina, offset);
            AppState.caixa = data;
            AppState.paginacao.caixa.total = count;
            AppState.paginacao.caixa.pagina = pagina;
            Renderer.renderCaixa(AppState.caixa);
            Renderer.renderPaginacao('caixa', count, pagina, itensPorPagina, (np) => DataService.loadCaixa(np));
        } catch (e) { console.error(e); }
    },

    async loadServicos(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const { data, count } = await this.fetchTable('servicos', 'data', false, itensPorPagina, offset);
            AppState.servicos = data;
            AppState.paginacao.servicos.total = count;
            AppState.paginacao.servicos.pagina = pagina;
            Renderer.renderServicos(AppState.servicos);
            Renderer.renderPaginacao('servicos', count, pagina, itensPorPagina, (np) => DataService.loadServicos(np));
        } catch (e) { console.error(e); }
    },

    async loadAgenda(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const { data, count } = await this.fetchTable('agenda', 'data_hora', true, itensPorPagina, offset);
            AppState.agenda = data;
            AppState.paginacao.agenda.total = count;
            AppState.paginacao.agenda.pagina = pagina;
            Renderer.renderAgenda(AppState.agenda);
            Renderer.renderPaginacao('agenda', count, pagina, itensPorPagina, (np) => DataService.loadAgenda(np));
        } catch (e) { console.error(e); }
    },

    async loadPiercings() {
        try { const { data } = await this.fetchTable('piercings_estoque', 'nome'); Renderer.renderEstoquePiercing(data); } 
        catch (e) { console.error(e); }
    },

    async loadVendasPiercing() {
        try {
            const { data } = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data', { ascending: false }).limit(100);
            Renderer.renderVendasPiercing(data || []);
        } catch (e) { console.error(e); }
    },

    async loadMateriais() {
        try { const { data } = await this.fetchTable('materiais_estoque', 'nome'); Renderer.renderEstoqueMaterial(data); } 
        catch (e) { console.error(e); }
    },

    async loadUsosMateriais() {
        try {
            const { data } = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data', { ascending: false }).limit(100);
            Renderer.renderUsosMateriais(data || []);
        } catch (e) { console.error(e); }
    }
};

// ==================== RENDERIZAÇÃO (mantida igual ao original, exceto escapeHtml) ====================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

const Renderer = {
    _renderTable: (idTbody, linhasHtml) => {
        const tbody = DomUtils.get(idTbody);
        if (!tbody) return;
        tbody.innerHTML = linhasHtml;
    },
    renderPaginacao: (prefixo, total, paginaAtual, itensPorPagina, callback) => {
        const container = DomUtils.get(`${prefixo}-paginacao`);
        if (!container) return;
        const totalPaginas = Math.ceil(total / itensPorPagina);
        if (totalPaginas <= 1) { container.innerHTML = ''; return; }
        let html = `<div class="paginacao">`;
        html += `<button ${paginaAtual === 1 ? 'disabled' : ''} data-pagina="${paginaAtual - 1}">&laquo; Anterior</button>`;
        for (let i = 1; i <= totalPaginas; i++) {
            html += `<button class="${i === paginaAtual ? 'active' : ''}" data-pagina="${i}">${i}</button>`;
        }
        html += `<button ${paginaAtual === totalPaginas ? 'disabled' : ''} data-pagina="${paginaAtual + 1}">Próximo &raquo;</button></div>`;
        container.innerHTML = html;
        container.querySelectorAll('button[data-pagina]').forEach(btn => {
            btn.addEventListener('click', () => callback(parseInt(btn.dataset.pagina)));
        });
    },
    renderCaixa(data) {
        const linhas = data.map(item => {
            const ent = MoneyUtils.parse(item.entradas);
            const sai = MoneyUtils.parse(item.saidas);
            return `<tr>
                <td>${DateUtils.formatDate(item.data)}</td>
                <td style="color:#34D399">+${MoneyUtils.format(ent)}</td>
                <td style="color:#F87171">-${MoneyUtils.format(sai)}</td>
                <td>${escapeHtml(item.descricao) || '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" data-acao="editar-caixa" data-id="${item.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-acao="excluir-caixa" data-id="${item.id}">Excluir</button>
                </td>
            </tr>`;
        }).join('');
        this._renderTable('caixa-tbody', data.length ? linhas : '<tr><td colspan="5">Nenhum lançamento</td></tr>');
    },
    renderServicos(data) {
        let totalValor = 0, totalEstudio = 0, totalRepasse = 0;
        const linhas = data.map(s => {
            const val = MoneyUtils.parse(s.valor_total);
            const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : val;
            const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : 0;
            totalValor += val;
            totalEstudio += estudio;
            totalRepasse += repasse;
            return `<tr>
                <td>${DateUtils.formatDate(s.data)}</td><td>${escapeHtml(s.cliente)}</td><td>${escapeHtml(s.tatuador_nome)}</td><td>${escapeHtml(s.tipo)}</td>
                <td>${escapeHtml(s.descricao) || '-'}</td><td>${MoneyUtils.format(val)}</td><td>${MoneyUtils.format(estudio)}</td>
                <td style="color:#34D399">${MoneyUtils.format(repasse)}</td><td>${escapeHtml(s.forma_pagamento)}</td>
                <td><button class="btn btn-warning btn-sm" data-acao="editar-servico" data-id="${s.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-acao="excluir-servico" data-id="${s.id}">Excluir</button></td>
            </tr>`;
        }).join('');
        this._renderTable('servicos-tbody', data.length ? linhas : '<tr><td colspan="10">Nenhum serviço</td></tr>');
        DomUtils.setHtml('servicos-total-valor', MoneyUtils.format(totalValor));
        DomUtils.setHtml('servicos-total-estudio', MoneyUtils.format(totalEstudio));
        DomUtils.setHtml('servicos-total-repasse', MoneyUtils.format(totalRepasse));
    },
    renderAgenda(data) {
        const linhas = data.map(a => {
            const statusClass = { Agendado: 'status-warning', Confirmado: 'status-info', Concluído: 'status-success', Cancelado: 'status-danger' }[a.status] || '';
            const realizarBtn = (a.status !== 'Concluído' && a.status !== 'Cancelado') 
                ? `<button class="btn btn-success btn-sm" data-acao="realizar-servico" data-id="${a.id}"><i class="fas fa-check"></i> Realizar</button>` : '';
            const dt = new Date(a.data_hora);
            return `<tr>
                <td>${dt.toLocaleDateString('pt-BR')}</td><td>${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${escapeHtml(a.cliente)}</td><td>${escapeHtml(a.tatuador_nome)}</td><td>${escapeHtml(a.tipo_servico)}</td>
                <td><span class="status-badge-item ${statusClass}">${escapeHtml(a.status)}</span></td><td>${escapeHtml(a.observacoes) || '-'}</td>
                <td class="acoes-agenda">${realizarBtn}<button class="btn btn-warning btn-sm" data-acao="editar-agenda" data-id="${a.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-acao="excluir-agenda" data-id="${a.id}">Excluir</button></td>
            </tr>`;
        }).join('');
        this._renderTable('agenda-tbody', data.length ? linhas : '<tr><td colspan="8">Nenhum agendamento</td></tr>');
    },
    renderEstoquePiercing(piercings) { /* ... (igual original) ... */ },
    renderVendasPiercing(vendas) { /* ... (igual original) ... */ },
    renderEstoqueMaterial(materiais) { /* ... (igual original) ... */ },
    renderUsosMateriais(usos) { /* ... (igual original) ... */ }
};

// ==================== DEMAIS FUNÇÕES (mantidas sem alteração, exceto chamadas de inicialização) ====================
// (Copie as funções restantes do script.js original para cá, garantindo que não haja duplicação de inicialização automática)

// Configura navegação e eventos
function setupNavigation() {
    document.querySelectorAll('.nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            DomUtils.get(sectionId).classList.add('active');
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Recarregar dados da seção conforme necessário (opcional)
        });
    });
}

function setupGlobalDelegation() {
    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const acao = btn.dataset.acao;
        const id = btn.dataset.id;
        // Encaminhar para módulos específicos (CaixaModule.editar(id), etc.)
        // Isso depende dos módulos definidos; mantenha como no original.
    });
}

// Funções de módulos (CaixaModule, ServicosModule, etc.) devem ser copiadas do original e estar disponíveis globalmente.

// Inicialização agora é controlada pelo login
document.addEventListener('DOMContentLoaded', () => {
    if (!supabaseClient) {
        AlertUtils.show('Supabase não disponível.', 'error');
        return;
    }
    checkSession();
});

// Expor funções globais necessárias (abrirModalCaixa, etc.)
// ... (copie as atribuições window.xxx do original)

// As funções de exemplo (popularPiercingsExemplo, etc.) também devem ser mantidas.