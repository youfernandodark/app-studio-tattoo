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
let currentUser = null;
const authContainer = document.getElementById('auth-container');
const appContent = document.getElementById('app-content');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const btnLogout = document.getElementById('btn-logout');
const userEmailDisplay = document.getElementById('user-email-display');

if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        document.getElementById('login-error').textContent = '';
    });
    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        document.getElementById('signup-error').textContent = '';
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        if (!email || !password) return errorEl.textContent = 'Preencha todos os campos.';
        try {
            LoadingUtils.show('Autenticando...');
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            currentUser = data.user;
            authContainer.style.display = 'none';
            appContent.style.display = 'block';
            userEmailDisplay.textContent = currentUser.email;
            await inicializarApp();
        } catch (error) {
            errorEl.textContent = error.message || 'Falha no login.';
        } finally {
            LoadingUtils.hide();
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-password-confirm').value;
        const errorEl = document.getElementById('signup-error');
        if (!email || !password || !confirm) return errorEl.textContent = 'Preencha todos os campos.';
        if (password !== confirm) return errorEl.textContent = 'As senhas não coincidem.';
        if (password.length < 6) return errorEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
        try {
            LoadingUtils.show('Criando conta...');
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            if (data.user && !data.session) {
                AlertUtils.show('Conta criada! Verifique seu e-mail para confirmar.', 'success');
                tabLogin.click();
            } else {
                currentUser = data.user;
                authContainer.style.display = 'none';
                appContent.style.display = 'block';
                userEmailDisplay.textContent = currentUser.email;
                await inicializarApp();
                AlertUtils.show('Conta criada com sucesso!', 'success');
            }
        } catch (error) {
            errorEl.textContent = error.message || 'Erro ao criar conta.';
        } finally {
            LoadingUtils.hide();
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (!await ConfirmModal.show('Deseja realmente sair?')) return;
        await supabaseClient.auth.signOut();
        currentUser = null;
        authContainer.style.display = 'flex';
        appContent.style.display = 'none';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-password-confirm').value = '';
        tabLogin.click();
    });
}

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        authContainer.style.display = 'none';
        appContent.style.display = 'block';
        userEmailDisplay.textContent = currentUser.email;
        await inicializarApp();
    } else {
        authContainer.style.display = 'flex';
        appContent.style.display = 'none';
    }
}

// ==================== UTILITÁRIOS ====================
const DomUtils = {
    get: (id) => document.getElementById(id),
    setHtml: (id, html) => { const el = DomUtils.get(id); if (el) el.innerHTML = html; },
    setValue: (id, value) => { const el = DomUtils.get(id); if (el) el.value = value; },
    getValue: (id) => DomUtils.get(id)?.value,
    setDisplay: (id, display) => { const el = DomUtils.get(id); if (el) el.style.display = display; },
    clearForm: (formId) => { const form = DomUtils.get(formId); if (form) form.reset(); },
    setReadOnly: (id, readonly) => { const el = DomUtils.get(id); if (el) el.readOnly = readonly; },
    setDisabled: (id, disabled) => { const el = DomUtils.get(id); if (el) el.disabled = disabled; }
};

function getLocalDateString() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

const DateUtils = {
    formatDate: (date) => {
        if (!date) return '-';
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [ano, mes, dia] = date.split('-');
            return `${dia}/${mes}/${ano}`;
        }
        const dt = new Date(date);
        return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('pt-BR');
    },
    formatDateTime: (date) => {
        if (!date) return '-';
        const dt = new Date(date);
        return isNaN(dt.getTime()) ? '-' : `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    },
    nowDate: () => getLocalDateString()
};

const MoneyUtils = {
    format: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0),
    parse: (value) => parseFloat(value) || 0
};

const ErrorHandler = {
    handle: (context, error) => {
        console.error(`Erro em ${context}:`, error);
        AlertUtils.show(`Erro em ${context}: ${error.message || error}`, 'error');
    }
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
            overlay.style.cssText = 'position:fixed; top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
            overlay.innerHTML = `<div style="background:#1e1e2a;padding:20px 32px;border-radius:16px;color:white;">
                <i class="fas fa-spinner fa-pulse"></i> <span id="loading-message">Carregando...</span>
            </div>`;
            document.body.appendChild(overlay);
        }
        const msgSpan = overlay.querySelector('#loading-message');
        if (msgSpan) msgSpan.innerText = message;
        overlay.style.display = 'flex';
    },
    hide: () => {
        const overlay = DomUtils.get('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
};

const ConfirmModal = {
    _modal: null, _resolve: null,
    init: () => {
        if (ConfirmModal._modal) return;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `<div class="modal-content confirm-modal" style="max-width:400px;text-align:center;">
            <h3><i class="fas fa-question-circle"></i> Confirmação</h3>
            <p id="confirm-message"></p>
            <div class="modal-actions" style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
                <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                <button class="btn btn-primary" id="confirm-ok">Confirmar</button>
            </div>
        </div>`;
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
        if (ConfirmModal._resolve) { ConfirmModal._resolve(result); ConfirmModal._resolve = null; }
    }
};

// ==================== ESTADO GLOBAL ====================
const AppState = {
    servicos: [], agenda: [], caixa: [], usosMateriais: [],
    config: { repasseEstudio: 30 },
    chartFaturamento: null, chartTipos: null, piercingChart: null,
    paginacao: {
        caixa: { pagina: 1, itensPorPagina: 10, total: 0 },
        servicos: { pagina: 1, itensPorPagina: 10, total: 0 },
        agenda: { pagina: 1, itensPorPagina: 10, total: 0 },
        usosMateriais: { pagina: 1, itensPorPagina: 10, total: 0 }
    },
    filtrosCaixa: { dataInicio: '', dataFim: '' },
    filtrosUsosMateriais: { materialId: '', dataInicio: '', dataFim: '' }
};

// ==================== MÓDULO DE DADOS ====================
const DataService = {
    async fetchTable(table, orderBy = null, ascending = true, limit = null, offset = 0, filters = {}) {
        let query = supabaseClient.from(table).select('*', { count: 'exact' });
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== '') {
                if (key === 'descricao') query = query.ilike('descricao', `%${value}%`);
                else query = query.eq(key, value);
            }
        });
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
        try {
            let result;
            if (id) result = await supabaseClient.from(table).update(record).eq('id', id);
            else result = await supabaseClient.from(table).insert([record]);
            if (result.error) throw result.error;
            return result.data;
        } catch (error) {
            console.error(`Erro ao salvar em ${table}:`, error);
            throw new Error(`Falha ao salvar: ${error.message || error}`);
        }
    },
    async deleteRecord(table, id) {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;
    },
    async fetchCaixaCompletoParaResumo() {
        try {
            let query = supabaseClient.from('caixa').select('data, entradas, saidas, saldo_final');
            if (AppState.filtrosCaixa.dataInicio) query = query.gte('data', AppState.filtrosCaixa.dataInicio);
            if (AppState.filtrosCaixa.dataFim) query = query.lte('data', AppState.filtrosCaixa.dataFim);
            query = query.order('data', { ascending: false }).order('id', { ascending: false });
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar resumo mensal:', e);
            return [];
        }
    },
    async loadCaixa(pagina = 1, itensPorPagina = 10, searchTerm = '') {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            let query = supabaseClient.from('caixa').select('*', { count: 'exact' });
            if (AppState.filtrosCaixa.dataInicio) query = query.gte('data', AppState.filtrosCaixa.dataInicio);
            if (AppState.filtrosCaixa.dataFim) query = query.lte('data', AppState.filtrosCaixa.dataFim);
            if (searchTerm) query = query.ilike('descricao', `%${searchTerm}%`);
            query = query.order('data', { ascending: false }).order('id', { ascending: false }).range(offset, offset + itensPorPagina - 1);
            const { data, error, count } = await query;
            if (error) throw error;
            AppState.caixa = data;
            AppState.paginacao.caixa.total = count;
            AppState.paginacao.caixa.pagina = pagina;
            Renderer.renderCaixa(AppState.caixa);
            Renderer.renderPaginacao('caixa', count, pagina, itensPorPagina, (novaPagina) => {
                const termo = DomUtils.getValue('search-caixa') || '';
                DataService.loadCaixa(novaPagina, itensPorPagina, termo);
            });
            this.fetchCaixaCompletoParaResumo().then(dadosCompletos => Renderer.renderCaixaResumoMensal(dadosCompletos));
        } catch (e) { ErrorHandler.handle('carregar caixa', e); }
    },
    async loadServicos(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const tatuador = DomUtils.getValue('filtro-tatuador-servico');
            const tipo = DomUtils.getValue('filtro-tipo-servico');
            const pagamento = DomUtils.getValue('filtro-pagamento');
            const data = DomUtils.getValue('filtro-data-servico');
            const search = DomUtils.getValue('search-servicos')?.toLowerCase();
            let query = supabaseClient.from('servicos').select('*', { count: 'exact' });
            if (tatuador) query = query.eq('tatuador_nome', tatuador);
            if (tipo) query = query.eq('tipo', tipo);
            if (pagamento) query = query.eq('forma_pagamento', pagamento);
            if (data) query = query.eq('data', data);
            if (search) query = query.ilike('cliente', `%${search}%`);
            query = query.order('data', { ascending: false }).range(offset, offset + itensPorPagina - 1);
            const { data: servicos, error, count } = await query;
            if (error) throw error;
            AppState.servicos = servicos || [];
            AppState.paginacao.servicos.total = count;
            AppState.paginacao.servicos.pagina = pagina;
            Renderer.renderServicos(AppState.servicos);
            Renderer.renderPaginacao('servicos', count, pagina, itensPorPagina, (novaPagina) => DataService.loadServicos(novaPagina));
        } catch (e) { ErrorHandler.handle('carregar serviços', e); }
    },
    async loadAgenda(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const tatuador = DomUtils.getValue('filtro-tatuador-agenda');
            const status = DomUtils.getValue('filtro-status-agenda');
            const data = DomUtils.getValue('filtro-data-agenda');
            let query = supabaseClient.from('agenda').select('*', { count: 'exact' });
            if (tatuador) query = query.eq('tatuador_nome', tatuador);
            if (status) query = query.eq('status', status);
            if (data) query = query.eq('data_hora', `${data}T00:00:00`);
            query = query.order('data_hora', { ascending: false }).range(offset, offset + itensPorPagina - 1);
            const { data: agenda, error, count } = await query;
            if (error) throw error;
            AppState.agenda = agenda || [];
            AppState.paginacao.agenda.total = count;
            AppState.paginacao.agenda.pagina = pagina;
            Renderer.renderAgenda(AppState.agenda);
            Renderer.renderPaginacao('agenda', count, pagina, itensPorPagina, (novaPagina) => DataService.loadAgenda(novaPagina));
        } catch (e) { ErrorHandler.handle('carregar agenda', e); }
    },
    async loadAllServicos() { try { AppState.servicos = await this.fetchAll('servicos', 'data', false); } catch (e) { ErrorHandler.handle('loadAllServicos', e); } },
    async loadAllCaixa() { try { AppState.caixa = await this.fetchAll('caixa', 'data', false); } catch (e) { ErrorHandler.handle('loadAllCaixa', e); } },
    async loadPiercings() { try { const { data } = await this.fetchTable('piercings_estoque', 'nome'); Renderer.renderEstoquePiercing(data); } catch (e) { ErrorHandler.handle('loadPiercings', e); } },
    async loadVendasPiercing() { try { const { data } = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data', { ascending: false }).limit(100); Renderer.renderVendasPiercing(data || []); } catch (e) { ErrorHandler.handle('loadVendasPiercing', e); } },
    async loadMateriais() { try { const { data } = await this.fetchTable('materiais_estoque', 'nome'); Renderer.renderEstoqueMaterial(data); } catch (e) { ErrorHandler.handle('loadMateriais', e); } },
    async loadUsosMateriais(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            let query = supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome, valor_unitario)', { count: 'exact' });
            if (AppState.filtrosUsosMateriais.materialId) query = query.eq('material_id', AppState.filtrosUsosMateriais.materialId);
            if (AppState.filtrosUsosMateriais.dataInicio) query = query.gte('data', AppState.filtrosUsosMateriais.dataInicio);
            if (AppState.filtrosUsosMateriais.dataFim) query = query.lte('data', AppState.filtrosUsosMateriais.dataFim);
            query = query.order('data', { ascending: false }).order('id', { ascending: false }).range(offset, offset + itensPorPagina - 1);
            const { data, error, count } = await query;
            if (error) throw error;
            AppState.usosMateriais = data || [];
            AppState.paginacao.usosMateriais.total = count;
            AppState.paginacao.usosMateriais.pagina = pagina;
            Renderer.renderUsosMateriais(AppState.usosMateriais);
            Renderer.renderPaginacao('usos-materiais', count, pagina, itensPorPagina, (novaPagina) => DataService.loadUsosMateriais(novaPagina, itensPorPagina));
        } catch (e) { ErrorHandler.handle('loadUsosMateriais', e); }
    }
};

// ==================== RENDERIZAÇÃO ====================
const Renderer = {
    _renderTable: (idTbody, linhasHtml) => {
        const tbody = DomUtils.get(idTbody);
        if (tbody) tbody.innerHTML = linhasHtml || '<tr><td colspan="10">Nenhum registro encontrado</td></tr>';
    },
    renderPaginacao: (prefixo, total, paginaAtual, itensPorPagina, callback) => {
        const container = DomUtils.get(`${prefixo}-paginacao`);
        if (!container) return;
        const totalPaginas = Math.ceil(total / itensPorPagina);
        if (totalPaginas <= 1) { container.innerHTML = ''; return; }
        let html = `<div class="paginacao"><button ${paginaAtual === 1 ? 'disabled' : ''} data-pagina="${paginaAtual - 1}">&laquo; Anterior</button>`;
        for (let i = 1; i <= totalPaginas; i++) html += `<button class="${i === paginaAtual ? 'active' : ''}" data-pagina="${i}">${i}</button>`;
        html += `<button ${paginaAtual === totalPaginas ? 'disabled' : ''} data-pagina="${paginaAtual + 1}">Próximo &raquo;</button></div>`;
        container.innerHTML = html;
        container.querySelectorAll('button[data-pagina]').forEach(btn => btn.addEventListener('click', () => {
            const np = parseInt(btn.dataset.pagina);
            if (!isNaN(np)) callback(np);
        }));
    },
    renderCaixa(data) {
        const linhas = data.map(item => {
            const ent = MoneyUtils.parse(item.entradas), sai = MoneyUtils.parse(item.saidas);
            const icon = ent > 0 ? '↑' : (sai > 0 ? '↓' : '•');
            const qtd = item.quantidade ? item.quantidade : '-';
            const un = item.unidade || '-';
            return `<tr><td>${DateUtils.formatDate(item.data)}</td>
                <td style="color:#34D399;font-weight:600;">${icon} ${MoneyUtils.format(ent)}</td>
                <td style="color:#F87171;font-weight:600;">${icon} ${MoneyUtils.format(sai)}</td>
                <td>${MoneyUtils.format(item.saldo_inicial)}</td>
                <td>${MoneyUtils.format(item.saldo_final)}</td>
                <td>${qtd}</td><td>${un}</td>
                <td title="${escapeHtml(item.descricao)}" style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.descricao) || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-icon" data-acao="editar-caixa" data-id="${item.id}" title="Editar descrição"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" data-acao="excluir-caixa" data-id="${item.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </td></tr>`;
        }).join('');
        this._renderTable('caixa-tbody', data.length ? linhas : null);
    },
    renderCaixaResumoMensal(dados) {
        const container = DomUtils.get('caixa-resumo-mensal');
        if (!container) return;
        if (!dados || dados.length === 0) { container.innerHTML = ''; return; }
        const meses = {};
        dados.forEach(item => {
            const mes = item.data.substring(0, 7);
            if (!meses[mes]) meses[mes] = { entradas: 0, saidas: 0, saldoFinal: 0 };
            meses[mes].entradas += MoneyUtils.parse(item.entradas);
            meses[mes].saidas += MoneyUtils.parse(item.saidas);
            meses[mes].saldoFinal = item.saldo_final;
        });
        const mesesOrdenados = Object.keys(meses).sort().reverse();
        let html = `<div style="background:#1e1e2a;border-radius:12px;padding:16px;margin-bottom:20px;">
            <h3 style="margin-top:0;color:#A0A0A0;"><i class="fas fa-calendar-alt"></i> Resumo Mensal`;
        if (AppState.filtrosCaixa.dataInicio || AppState.filtrosCaixa.dataFim) html += `<span style="font-size:0.8rem;color:#FBBF24;margin-left:8px;"><i class="fas fa-filter"></i> Filtro ativo</span>`;
        html += `</h3><div style="display:flex;flex-wrap:wrap;gap:12px;">`;
        mesesOrdenados.forEach(mes => {
            const [ano, mesNum] = mes.split('-');
            const nomeMes = new Date(ano, mesNum - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const totais = meses[mes];
            html += `<div style="background:#2a2a3a;border-radius:8px;padding:12px;min-width:180px;flex:1 0 auto;">
                <div style="font-weight:bold;margin-bottom:8px;color:#C084FC;">${nomeMes}</div>
                <div style="display:flex;justify-content:space-between;"><span style="color:#34D399;">Entradas:</span> <span>${MoneyUtils.format(totais.entradas)}</span></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:#F87171;">Saídas:</span> <span>${MoneyUtils.format(totais.saidas)}</span></div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;border-top:1px solid #3a3a4a;padding-top:6px;"><span style="font-weight:bold;">Saldo final:</span> <span style="font-weight:bold;">${MoneyUtils.format(totais.saldoFinal)}</span></div>
            </div>`;
        });
        html += `</div></div>`;
        container.innerHTML = html;
    },
    renderServicos(data) {
        let totalValor = 0, totalEstudio = 0, totalRepasse = 0;
        const linhas = data.map(s => {
            const val = MoneyUtils.parse(s.valor_total);
            const perc = (s.tatuador_nome === 'Thalia') ? (s.porcentagem_estudio ?? AppState.config.repasseEstudio) : 100;
            const percEstudio = perc / 100;
            const estudio = s.tatuador_nome === 'Thalia' ? val * percEstudio : val;
            const repasse = s.tatuador_nome === 'Thalia' ? val * (1 - percEstudio) : 0;
            totalValor += val; totalEstudio += estudio; totalRepasse += repasse;
            const porcentagemExibida = s.tatuador_nome === 'Thalia' ? `(${perc}%)` : '';
            return `<tr><td>${DateUtils.formatDate(s.data)}</td><td>${escapeHtml(s.cliente)}</td>
                <td>${escapeHtml(s.tatuador_nome)}</td><td>${escapeHtml(s.tipo)}</td>
                <td title="${escapeHtml(s.descricao)}">${escapeHtml(s.descricao) || '-'}</td>
                <td class="valor">${MoneyUtils.format(val)}</td>
                <td class="valor">${MoneyUtils.format(estudio)}${porcentagemExibida}</td>
                <td class="valor repasse">${MoneyUtils.format(repasse)}</td>
                <td>${escapeHtml(s.forma_pagamento)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" data-acao="editar-servico" data-id="${s.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" data-acao="excluir-servico" data-id="${s.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </td></tr>`;
        }).join('');
        this._renderTable('servicos-tbody', data.length ? linhas : null);
        DomUtils.setHtml('servicos-total-valor', MoneyUtils.format(totalValor));
        DomUtils.setHtml('servicos-total-estudio', MoneyUtils.format(totalEstudio));
        DomUtils.setHtml('servicos-total-repasse', MoneyUtils.format(totalRepasse));
    },
    renderAgenda(data) {
        const linhas = data.map(a => {
            const statusClass = { 'Agendado': 'status-warning', 'Confirmado': 'status-info', 'Concluído': 'status-success', 'Cancelado': 'status-danger' }[a.status] || '';
            const realizarBtn = (a.status !== 'Concluído' && a.status !== 'Cancelado') ? `<button class="btn-icon" data-acao="realizar-servico" data-id="${a.id}" title="Realizar Serviço"><i class="fas fa-check-circle"></i></button>` : '';
            const reagendarBtn = (a.status !== 'Concluído' && a.status !== 'Cancelado') ? `<button class="btn-icon" data-acao="reagendar-agenda" data-id="${a.id}" title="Reagendar"><i class="fas fa-calendar-plus"></i></button>` : '';
            const cancelarBtn = (a.status !== 'Concluído' && a.status !== 'Cancelado') ? `<button class="btn-icon" data-acao="cancelar-agenda" data-id="${a.id}" title="Cancelar agendamento"><i class="fas fa-ban"></i></button>` : '';
            const dt = new Date(a.data_hora);
            const dataStr = !isNaN(dt.getTime()) ? dt.toLocaleDateString('pt-BR') : '-';
            const horaStr = !isNaN(dt.getTime()) ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
            return `<tr><td>${dataStr}</td><td>${horaStr}</td><td>${escapeHtml(a.cliente)}</td>
                <td>${escapeHtml(a.tatuador_nome)}</td><td>${escapeHtml(a.tipo_servico)}</td>
                <td><span class="status-badge-item ${statusClass}">${escapeHtml(a.status)}</span></td>
                <td title="${escapeHtml(a.observacoes)}">${escapeHtml(a.observacoes) || '-'}</td>
                <td class="actions-cell">${realizarBtn}${reagendarBtn}${cancelarBtn}
                    <button class="btn-icon" data-acao="editar-agenda" data-id="${a.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" data-acao="excluir-agenda" data-id="${a.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </td></tr>`;
        }).join('');
        this._renderTable('agenda-tbody', data.length ? linhas : null);
    },
    renderEstoquePiercing(piercings) {
        const tbody = DomUtils.get('estoque-piercing-tbody');
        if (!tbody) return;
        tbody.innerHTML = piercings.length ? piercings.map(p => `<tr><td>${escapeHtml(p.nome)}</td><td>${p.quantidade}</td>
            <td>${MoneyUtils.format(p.preco_venda)}</td><td>${MoneyUtils.format(p.custo_unitario || 0)}</td>
            <td class="actions-cell">
                <button class="btn-icon" data-acao="editar-piercing" data-id="${p.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" data-acao="excluir-piercing" data-id="${p.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
            </td></tr>`).join('') : '<tr><td colspan="5">Nenhum piercing</td></tr>';
        const select = DomUtils.get('venda-piercing-id');
        if (select) select.innerHTML = '<option value="">Selecione</option>' + piercings.filter(p => p.quantidade > 0).map(p => `<option value="${p.id}" data-preco="${p.preco_venda}" data-custo="${p.custo_unitario || 0}">${escapeHtml(p.nome)} - Venda: ${MoneyUtils.format(p.preco_venda)} | Estoque: ${p.quantidade}</option>`).join('');
    },
    renderVendasPiercing(vendas) {
        const tbody = DomUtils.get('vendas-piercing-tbody');
        if (tbody) tbody.innerHTML = vendas.length ? vendas.map(v => `<tr><td>${DateUtils.formatDate(v.data)}</td><td>${escapeHtml(v.piercing?.nome || '?')}</td>
            <td>${v.quantidade}</td><td>${MoneyUtils.format(v.valor_total)}</td><td>${escapeHtml(v.cliente || '-')}</td></tr>`).join('') : '<tr><td colspan="5">Nenhuma venda</td></tr>';
    },
    renderEstoqueMaterial(materiais) {
        const tbody = DomUtils.get('estoque-material-tbody');
        if (tbody) tbody.innerHTML = materiais.length ? materiais.map(m => `<tr><td>${escapeHtml(m.nome)}</td><td>${m.quantidade}</td>
            <td>${MoneyUtils.format(m.valor_unitario)}</td>
            <td class="actions-cell">
                <button class="btn-icon" data-acao="editar-material" data-id="${m.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" data-acao="excluir-material" data-id="${m.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
            </td></tr>`).join('') : '<tr><td colspan="4">Nenhum material</td></tr>';
        const select = DomUtils.get('uso-material-id');
        if (select) select.innerHTML = '<option value="">Selecione</option>' + materiais.filter(m => m.quantidade > 0).map(m => `<option value="${m.id}" data-custo="${m.valor_unitario}">${escapeHtml(m.nome)} (${m.quantidade} un.) - Custo un: ${MoneyUtils.format(m.valor_unitario)}</option>`).join('');
    },
    renderUsosMateriais(usos) {
        const tbody = DomUtils.get('usos-materiais-tbody');
        if (!tbody) return;
        if (!usos || usos.length === 0) { tbody.innerHTML = '<tr><td colspan="5">Nenhum uso registrado</td></tr>'; return; }
        tbody.innerHTML = usos.map(u => {
            const custoTotal = (u.material?.valor_unitario || 0) * u.quantidade;
            return `<tr><td>${DateUtils.formatDateTime(u.data)}</td><td>${escapeHtml(u.material?.nome || '?')}</td>
                <td>${u.quantidade}</td><td>${MoneyUtils.format(custoTotal)}</td>
                <td title="${escapeHtml(u.observacao)}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.observacao) || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-icon" data-acao="editar-uso-material" data-id="${u.id}" title="Editar uso"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" data-acao="excluir-uso-material" data-id="${u.id}" title="Excluir uso"><i class="fas fa-trash-alt"></i></button>
                </td></tr>`;
        }).join('');
    }
};

function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]); }

// ==================== DASHBOARD ====================
async function atualizarDashboard() {
    await DataService.loadAllServicos();
    await DataService.loadAllCaixa();
    const saldoAtual = AppState.caixa.length > 0 ? AppState.caixa[0].saldo_final : 0;
    const totalSaidas = AppState.caixa.reduce((s, i) => s + MoneyUtils.parse(i.saidas), 0);
    const servicosRealizados = AppState.servicos.length;
    const faturamentoBruto = AppState.servicos.reduce((s, sv) => s + MoneyUtils.parse(sv.valor_total), 0);
    const parteEstudio = AppState.servicos.reduce((s, sv) => {
        const valor = MoneyUtils.parse(sv.valor_total);
        const perc = (sv.tatuador_nome === 'Thalia') ? (sv.porcentagem_estudio ?? AppState.config.repasseEstudio) : 100;
        return s + (sv.tatuador_nome === 'Thalia' ? valor * (perc / 100) : valor);
    }, 0);
    const repasseThalia = AppState.servicos.reduce((s, sv) => {
        const valor = MoneyUtils.parse(sv.valor_total);
        if (sv.tatuador_nome !== 'Thalia') return s;
        const perc = sv.porcentagem_estudio ?? AppState.config.repasseEstudio;
        return s + valor * (1 - perc / 100);
    }, 0);
    DomUtils.setHtml('saldo-atual', MoneyUtils.format(saldoAtual));
    DomUtils.setHtml('faturamento-bruto', MoneyUtils.format(faturamentoBruto));
    DomUtils.setHtml('parte-estudio', MoneyUtils.format(parteEstudio));
    DomUtils.setHtml('repasse-thalia', MoneyUtils.format(repasseThalia));
    DomUtils.setHtml('total-saidas', MoneyUtils.format(totalSaidas));
    DomUtils.setHtml('servicos-realizados', servicosRealizados);
    const recentes = AppState.servicos.slice(0, 5);
    DomUtils.setHtml('servicos-recentes', recentes.length ? `<ul>${recentes.map(s => `<li>${DateUtils.formatDate(s.data)} - ${escapeHtml(s.cliente)}: ${MoneyUtils.format(s.valor_total)}</li>`).join('')}</ul>` : 'Nenhum');
    const proximos = AppState.agenda.filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'Cancelado').slice(0, 5);
    DomUtils.setHtml('proximos-agendamentos', proximos.length ? `<ul>${proximos.map(a => `<li>${DateUtils.formatDateTime(a.data_hora)} - ${escapeHtml(a.cliente)}</li>`).join('')}</ul>` : 'Nenhum');
    
    const canvasFaturamento = DomUtils.get('chart-faturamento');
    if (canvasFaturamento) {
        const ctx = canvasFaturamento.getContext('2d');
        const meses = [], valores = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            meses.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
            const soma = AppState.servicos.filter(s => { const [ano, mes] = s.data.split('-'); return parseInt(mes)-1 === d.getMonth() && parseInt(ano) === d.getFullYear(); }).reduce((acc, sv) => acc + MoneyUtils.parse(sv.valor_total), 0);
            valores.push(soma);
        }
        if (!AppState.chartFaturamento) AppState.chartFaturamento = new Chart(ctx, { type: 'bar', data: { labels: meses, datasets: [{ label: 'Faturamento Bruto', data: valores, backgroundColor: '#818CF8' }] }, options: { responsive: true } });
        else { AppState.chartFaturamento.data.labels = meses; AppState.chartFaturamento.data.datasets[0].data = valores; AppState.chartFaturamento.update(); }
    }
    const canvasTipos = DomUtils.get('chart-tipos');
    if (canvasTipos) {
        const ctx = canvasTipos.getContext('2d');
        const tatuagens = AppState.servicos.filter(s => s.tipo === 'Tatuagem').length;
        const piercingsServ = AppState.servicos.filter(s => s.tipo === 'Piercing').length;
        if (!AppState.chartTipos) AppState.chartTipos = new Chart(ctx, { type: 'doughnut', data: { labels: ['Tatuagens', 'Piercings'], datasets: [{ data: [tatuagens, piercingsServ], backgroundColor: ['#818CF8', '#C084FC'] }] } });
        else { AppState.chartTipos.data.datasets[0].data = [tatuagens, piercingsServ]; AppState.chartTipos.update(); }
    }
}

// ==================== RELATÓRIOS ====================
async function carregarRelatorios() {
    await DataService.loadAllServicos();
    await DataService.loadAllCaixa();
    const faturamentoPorTatuador = {};
    AppState.servicos.forEach(s => { faturamentoPorTatuador[s.tatuador_nome] = (faturamentoPorTatuador[s.tatuador_nome] || 0) + MoneyUtils.parse(s.valor_total); });
    DomUtils.setHtml('faturamento-tatuador', Object.entries(faturamentoPorTatuador).map(([nome, valor]) => `<div><strong>${escapeHtml(nome)}:</strong> ${MoneyUtils.format(valor)}</div>`).join('') || 'Sem dados');
    const totalRepThalia = AppState.servicos.reduce((s, sv) => {
        if (sv.tatuador_nome !== 'Thalia') return s;
        const valor = MoneyUtils.parse(sv.valor_total);
        const perc = sv.porcentagem_estudio ?? AppState.config.repasseEstudio;
        return s + valor * (1 - perc / 100);
    }, 0);
    DomUtils.setHtml('relatorio-repasse', `<strong>Total a repassar para Thalia:</strong> ${MoneyUtils.format(totalRepThalia)}`);
    const parteEstudio = AppState.servicos.reduce((s, sv) => {
        const valor = MoneyUtils.parse(sv.valor_total);
        const perc = (sv.tatuador_nome === 'Thalia') ? (sv.porcentagem_estudio ?? AppState.config.repasseEstudio) : 100;
        return s + (sv.tatuador_nome === 'Thalia' ? valor * (perc / 100) : valor);
    }, 0);
    const totalSaidas = AppState.caixa.reduce((s, c) => s + MoneyUtils.parse(c.saidas), 0);
    DomUtils.setHtml('relatorio-lucro-liquido', `<strong>Lucro Líquido (Estúdio):</strong> ${MoneyUtils.format(parteEstudio - totalSaidas)}`);
    
    const diasPorMes = {};
    AppState.servicos.forEach(servico => {
        if (servico.data) {
            const mes = servico.data.substring(0, 7);
            if (!diasPorMes[mes]) diasPorMes[mes] = new Set();
            diasPorMes[mes].add(servico.data);
        }
    });
    const mesesOrdenados = Object.keys(diasPorMes).sort().reverse();
    let htmlDias = '<div style="background:#1e1e2a;border-radius:12px;padding:16px;margin-top:20px;"><h3><i class="fas fa-calendar-check"></i> Dias trabalhados por mês</h3><ul style="list-style:none;padding:0;">';
    for (const mes of mesesOrdenados) {
        const [ano, mesNum] = mes.split('-');
        const nomeMes = new Date(ano, mesNum - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        htmlDias += `<li style="margin-bottom:8px;"><strong>${nomeMes}</strong>: ${diasPorMes[mes].size} dia(s)</li>`;
    }
    htmlDias += '</ul></div>';
    let containerDias = DomUtils.get('dias-trabalhados-container');
    if (!containerDias) {
        const relSection = DomUtils.get('relatorios');
        if (relSection) { containerDias = document.createElement('div'); containerDias.id = 'dias-trabalhados-container'; relSection.appendChild(containerDias); }
    }
    if (containerDias) containerDias.innerHTML = htmlDias;
}

// ==================== FUNÇÕES AUXILIARES DO CAIXA ====================
async function obterUltimoCaixa() {
    const { data, error } = await supabaseClient.from('caixa').select('data, saldo_final').order('data', { ascending: false }).order('id', { ascending: false }).limit(1);
    if (error) throw error;
    return data?.length ? data[0] : null;
}
async function registrarEntradaCaixa(data, valor, descricao) {
    if (valor <= 0) return;
    const ultimo = await obterUltimoCaixa();
    if (ultimo && data < ultimo.data) throw new Error(`Data inválida: não pode ser anterior a ${DateUtils.formatDate(ultimo.data)}.`);
    const saldoInicial = ultimo ? ultimo.saldo_final : 0;
    const { error } = await supabaseClient.from('caixa').insert([{ data, saldo_inicial: saldoInicial, entradas: valor, saidas: 0, saldo_final: saldoInicial + valor, descricao }]);
    if (error) throw error;
    await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
    AlertUtils.show(`Entrada registrada: ${MoneyUtils.format(valor)}`, 'success');
}
async function registrarSaidaCaixa(data, valor, descricao) {
    if (valor <= 0) return;
    const ultimo = await obterUltimoCaixa();
    if (ultimo && data < ultimo.data) throw new Error(`Data inválida: não pode ser anterior a ${DateUtils.formatDate(ultimo.data)}.`);
    const saldoInicial = ultimo ? ultimo.saldo_final : 0;
    const { error } = await supabaseClient.from('caixa').insert([{ data, saldo_inicial: saldoInicial, entradas: 0, saidas: valor, saldo_final: saldoInicial - valor, descricao }]);
    if (error) throw error;
    await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
    AlertUtils.show(`Saída registrada: ${MoneyUtils.format(valor)}`, 'success');
}

// ==================== MÓDULO CAIXA ====================
const CaixaModule = {
    abrirModal: async () => {
        DomUtils.clearForm('form-caixa');
        DomUtils.setValue('caixa-data', DateUtils.nowDate());
        DomUtils.setValue('caixa-quantidade', '');
        DomUtils.setValue('caixa-unidade', '');
        DomUtils.setReadOnly('caixa-data', false);
        DomUtils.setReadOnly('caixa-entradas', false);
        DomUtils.setReadOnly('caixa-saidas', false);
        DomUtils.setReadOnly('caixa-saldo-inicial', true); 
        try {
            const ultimo = await obterUltimoCaixa();
            DomUtils.setValue('caixa-saldo-inicial', ultimo ? ultimo.saldo_final : 0);
        } catch (e) { ErrorHandler.handle('obter saldo inicial', e); }
        const aviso = DomUtils.get('caixa-edicao-aviso');
        if (aviso) aviso.remove();
        DomUtils.setDisplay('modal-caixa', 'block');
    },
    salvar: async () => {
        const id = DomUtils.getValue('caixa-id');
        const data = DomUtils.getValue('caixa-data');
        const entradas = MoneyUtils.parse(DomUtils.getValue('caixa-entradas'));
        const saidas = MoneyUtils.parse(DomUtils.getValue('caixa-saidas'));
        const descricao = DomUtils.getValue('caixa-descricao');
        const quantidade = DomUtils.getValue('caixa-quantidade') ? parseFloat(DomUtils.getValue('caixa-quantidade')) : null;
        const unidade = DomUtils.getValue('caixa-unidade') || null;
        if (!data) { AlertUtils.show('Data é obrigatória', 'error'); return; }
        try {
            LoadingUtils.show('Salvando...');
            let saldoInicial;
            if (id) {
                const registroOriginal = AppState.caixa.find(c => c.id == id);
                if (!registroOriginal) throw new Error('Registro não encontrado');
                saldoInicial = registroOriginal.saldo_inicial;
                await DataService.saveRecord('caixa', {
                    data: registroOriginal.data, saldo_inicial: saldoInicial,
                    entradas: MoneyUtils.parse(registroOriginal.entradas), saidas: MoneyUtils.parse(registroOriginal.saidas),
                    saldo_final: registroOriginal.saldo_final, descricao, quantidade, unidade
                }, id);
            } else {
                const ultimo = await obterUltimoCaixa();
                if (ultimo && data < ultimo.data) throw new Error(`A data não pode ser anterior ao último lançamento (${DateUtils.formatDate(ultimo.data)}).`);
                saldoInicial = ultimo ? ultimo.saldo_final : 0;
                await DataService.saveRecord('caixa', { data, saldo_inicial: saldoInicial, entradas, saidas, saldo_final: saldoInicial + entradas - saidas, descricao, quantidade, unidade }, null);
            }
            DomUtils.setDisplay('modal-caixa', 'none');
            await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
            atualizarDashboard();
            AlertUtils.show(id ? 'Descrição atualizada' : 'Lançamento salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar caixa', e); AlertUtils.show(e.message, 'error'); } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.caixa.find(c => c.id == id);
        if (item) {
            DomUtils.setValue('caixa-id', item.id);
            DomUtils.setValue('caixa-data', item.data);
            DomUtils.setValue('caixa-saldo-inicial', item.saldo_inicial);
            DomUtils.setValue('caixa-entradas', item.entradas);
            DomUtils.setValue('caixa-saidas', item.saidas);
            DomUtils.setValue('caixa-descricao', item.descricao || '');
            DomUtils.setValue('caixa-quantidade', item.quantidade || '');
            DomUtils.setValue('caixa-unidade', item.unidade || '');
            DomUtils.setReadOnly('caixa-data', true);
            DomUtils.setReadOnly('caixa-entradas', true);
            DomUtils.setReadOnly('caixa-saidas', true);
            DomUtils.setReadOnly('caixa-saldo-inicial', true);
            let aviso = DomUtils.get('caixa-edicao-aviso');
            if (!aviso) {
                aviso = document.createElement('div');
                aviso.id = 'caixa-edicao-aviso';
                aviso.style.cssText = 'background:#FEF3C7;color:#92400E;padding:8px 12px;border-radius:8px;margin-bottom:15px;font-size:14px;';
                aviso.innerHTML = '<i class="fas fa-info-circle"></i> Apenas a <strong>descrição</strong> pode ser editada. Alterações de valor/data exigem lançamentos de ajuste.';
                DomUtils.get('form-caixa').insertBefore(aviso, DomUtils.get('form-caixa').firstChild);
            }
            DomUtils.setDisplay('modal-caixa', 'block');
        }
    },
    excluir: async (id) => {
        const registro = AppState.caixa.find(c => c.id == id);
        if (!registro) return;
        if (!await ConfirmModal.show('Excluir este lançamento? ⚠️ O saldo subsequente não será recalculado automaticamente. Faça ajustes manuais se necessário.')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('caixa', id);
            await DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || '');
            atualizarDashboard();
            AlertUtils.show('Lançamento excluído.', 'success');
        } catch (e) { ErrorHandler.handle('excluir caixa', e); } finally { LoadingUtils.hide(); }
    },
    filtrar: () => DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || ''),
    aplicarFiltroPeriodo: () => {
        AppState.filtrosCaixa.dataInicio = DomUtils.getValue('filtro-caixa-inicio');
        AppState.filtrosCaixa.dataFim = DomUtils.getValue('filtro-caixa-fim');
        DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || '');
    },
    limparFiltros: () => {
        AppState.filtrosCaixa.dataInicio = ''; AppState.filtrosCaixa.dataFim = '';
        DomUtils.setValue('filtro-caixa-inicio', ''); DomUtils.setValue('filtro-caixa-fim', ''); DomUtils.setValue('search-caixa', '');
        DataService.loadCaixa(1, 10, '');
    }
};

// ==================== MÓDULO SERVIÇOS ====================
let pendingAgendaId = null;
async function encontrarLancamentoServico(servicoOriginal) {
    const descricaoPadrao = `Serviço #${servicoOriginal.id}: ${servicoOriginal.cliente} - ${servicoOriginal.tipo} (${servicoOriginal.tatuador_nome})`;
    const { data, error } = await supabaseClient.from('caixa').select('*').eq('data', servicoOriginal.data).eq('descricao', descricaoPadrao).eq('entradas', servicoOriginal.valor_total);
    if (error) { console.warn('Erro ao buscar lançamento no caixa:', error); return null; }
    return data?.[0] || null;
}
const ServicosModule = {
    abrirModal: () => {
        DomUtils.clearForm('form-servico');
        DomUtils.setValue('servico-data', DateUtils.nowDate());
        DomUtils.setDisplay('modal-servico', 'block');
        ServicosModule.calcularRepasse();
    },
    calcularRepasse: () => {
        const valor = MoneyUtils.parse(DomUtils.getValue('servico-valor'));
        const tatuador = DomUtils.getValue('servico-tatuador');
        const percEstudio = tatuador === 'Thalia' ? (AppState.config.repasseEstudio / 100) : 1;
        const estudio = tatuador === 'Thalia' ? valor * percEstudio : valor;
        const repasse = tatuador === 'Thalia' ? valor * (1 - percEstudio) : 0;
        DomUtils.setHtml('valor-estudio', MoneyUtils.format(estudio));
        DomUtils.setHtml('valor-repasse', MoneyUtils.format(repasse));
        const percentLabel = DomUtils.get('repasse-percent-label');
        if (percentLabel) percentLabel.textContent = tatuador === 'Thalia' ? AppState.config.repasseEstudio : '100';
    },
    salvar: async () => {
        const id = DomUtils.getValue('servico-id');
        const tatuador = DomUtils.getValue('servico-tatuador');
        const record = {
            data: DomUtils.getValue('servico-data'), cliente: DomUtils.getValue('servico-cliente'), tatuador_nome: tatuador,
            tipo: DomUtils.getValue('servico-tipo'), descricao: DomUtils.getValue('servico-descricao'),
            valor_total: MoneyUtils.parse(DomUtils.getValue('servico-valor')), forma_pagamento: DomUtils.getValue('servico-pagamento')
        };
        record.porcentagem_estudio = tatuador === 'Thalia' ? AppState.config.repasseEstudio : null;
        if (!record.data || !record.cliente || !record.tatuador_nome || !record.tipo) { AlertUtils.show('Preencha todos os campos obrigatórios.', 'error'); return; }
        try {
            LoadingUtils.show(id ? 'Atualizando serviço...' : 'Criando serviço...');
            if (id) {
                const { data: original, error: errOriginal } = await supabaseClient.from('servicos').select('*').eq('id', id).single();
                if (errOriginal) throw errOriginal;
                await DataService.saveRecord('servicos', record, id);
                if (original.valor_total !== record.valor_total || original.data !== record.data) {
                    const lancamento = await encontrarLancamentoServico(original);
                    if (lancamento) {
                        await supabaseClient.from('caixa').delete().eq('id', lancamento.id);
                        await registrarEntradaCaixa(record.data, record.valor_total, `Serviço #${id}: ${record.cliente} - ${record.tipo} (${record.tatuador_nome})`);
                        AlertUtils.show('Serviço atualizado e caixa ajustado. Verifique a consistência do saldo.', 'success');
                    } else {
                        AlertUtils.show('Serviço atualizado, mas o lançamento original no caixa não foi encontrado.', 'warning');
                    }
                } else { AlertUtils.show('Serviço atualizado (sem alterações financeiras).', 'success'); }
            } else {
                const { data: novo, error: insertError } = await supabaseClient.from('servicos').insert([record]).select('id').single();
                if (insertError) throw insertError;
                await registrarEntradaCaixa(record.data, record.valor_total, `Serviço #${novo.id}: ${record.cliente} - ${record.tipo} (${record.tatuador_nome})`);
                AlertUtils.show('Serviço criado e registrado no caixa', 'success');
            }
            DomUtils.setDisplay('modal-servico', 'none');
            await DataService.loadServicos(AppState.paginacao.servicos.pagina);
            await atualizarDashboard();
            if (pendingAgendaId) {
                await DataService.saveRecord('agenda', { status: 'Concluído' }, pendingAgendaId);
                await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
                AlertUtils.show('Agendamento concluído!', 'success');
                pendingAgendaId = null;
            }
        } catch (e) { ErrorHandler.handle('salvar serviço', e); AlertUtils.show('Falha ao salvar serviço: ' + (e.message || 'Erro desconhecido'), 'error'); } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        if (!AppState.servicos.length) await DataService.loadServicos(1, 10);
        let item = AppState.servicos.find(s => s.id == id);
        if (!item) { const { data, error } = await supabaseClient.from('servicos').select('*').eq('id', id).single(); if (error || !data) { AlertUtils.show('Serviço não encontrado.', 'error'); return; } item = data; }
        DomUtils.setValue('servico-id', item.id); DomUtils.setValue('servico-data', item.data);
        DomUtils.setValue('servico-cliente', item.cliente); DomUtils.setValue('servico-tatuador', item.tatuador_nome);
        DomUtils.setValue('servico-tipo', item.tipo); DomUtils.setValue('servico-descricao', item.descricao || '');
        DomUtils.setValue('servico-valor', item.valor_total); DomUtils.setValue('servico-pagamento', item.forma_pagamento);
        DomUtils.setDisplay('modal-servico', 'block'); ServicosModule.calcularRepasse();
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este serviço? Esta ação não remove o lançamento correspondente no caixa.')) return;
        try { LoadingUtils.show('Excluindo...'); await DataService.deleteRecord('servicos', id); await DataService.loadServicos(AppState.paginacao.servicos.pagina); await atualizarDashboard(); AlertUtils.show('Serviço excluído', 'success'); } 
        catch (e) { ErrorHandler.handle('excluir serviço', e); } finally { LoadingUtils.hide(); }
    },
    filtrar: () => DataService.loadServicos(1),
    limparFiltros: () => {
        DomUtils.setValue('filtro-tatuador-servico', ''); DomUtils.setValue('filtro-tipo-servico', '');
        DomUtils.setValue('filtro-pagamento', ''); DomUtils.setValue('filtro-data-servico', ''); DomUtils.setValue('search-servicos', '');
        DataService.loadServicos(1);
    }
};

// ==================== MÓDULO AGENDA ====================
const AgendaModule = {
    _isReagendamento: false, _agendamentoOriginal: null,
    abrirModal: () => { DomUtils.clearForm('form-agenda'); DomUtils.setValue('agenda-data', DateUtils.nowDate()); DomUtils.setDisplay('modal-agenda', 'block'); AgendaModule._isReagendamento = false; AgendaModule._agendamentoOriginal = null; },
    salvar: async () => {
        const id = DomUtils.getValue('agenda-id');
        const dataLocal = DomUtils.getValue('agenda-data');
        const horaLocal = DomUtils.getValue('agenda-horario');
        if (!dataLocal || !horaLocal) { AlertUtils.show('Data e horário obrigatórios', 'error'); return; }
        const dataHoraLocal = new Date(`${dataLocal}T${horaLocal}:00`);
        if (isNaN(dataHoraLocal.getTime())) { AlertUtils.show('Data/hora inválida', 'error'); return; }
        const record = {
            data_hora: dataHoraLocal.toISOString(), cliente: DomUtils.getValue('agenda-cliente'), tatuador_nome: DomUtils.getValue('agenda-tatuador'),
            tipo_servico: DomUtils.getValue('agenda-tipo'), valor_estimado: 0, forma_pagamento: null,
            status: DomUtils.getValue('agenda-status'), observacoes: DomUtils.getValue('agenda-obs')
        };
        try {
            LoadingUtils.show('Salvando...');
            if (AgendaModule._isReagendamento) {
                const notaReagendamento = `[Reagendado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}]`;
                record.observacoes = record.observacoes ? `${record.observacoes} ${notaReagendamento}` : notaReagendamento;
                record.status = 'Agendado';
            }
            await DataService.saveRecord('agenda', record, id || null);
            DomUtils.setDisplay('modal-agenda', 'none');
            await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
            atualizarDashboard();
            AlertUtils.show(id ? (AgendaModule._isReagendamento ? '✅ Agendamento reagendado com sucesso!' : 'Agendamento atualizado') : 'Agendamento salvo', 'success');
            
            // Gera PDF automaticamente após salvar
            const dadosPdf = { id, ...record, data_hora: dataHoraLocal, reagendado: AgendaModule._isReagendamento };
            await gerarComprovanteAgendamentoPDF(dadosPdf);
            
            AgendaModule._isReagendamento = false; AgendaModule._agendamentoOriginal = null;
        } catch (e) { ErrorHandler.handle('salvar agenda', e); AlertUtils.show('Erro ao salvar: ' + e.message, 'error'); } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.agenda.find(a => a.id == id);
        if (!item) { const { data, error } = await supabaseClient.from('agenda').select('*').eq('id', id).single(); if (error || !data) { AlertUtils.show('Agendamento não encontrado', 'error'); return; } item = data; }
        if (item) {
            const dt = new Date(item.data_hora);
            if (!isNaN(dt.getTime())) {
                DomUtils.setValue('agenda-id', item.id); DomUtils.setValue('agenda-data', dt.toISOString().split('T')[0]);
                DomUtils.setValue('agenda-horario', dt.toTimeString().slice(0,5)); DomUtils.setValue('agenda-cliente', item.cliente);
                DomUtils.setValue('agenda-tatuador', item.tatuador_nome); DomUtils.setValue('agenda-tipo', item.tipo_servico);
                DomUtils.setValue('agenda-status', item.status); DomUtils.setValue('agenda-obs', item.observacoes || '');
                DomUtils.setDisplay('modal-agenda', 'block'); AgendaModule._agendamentoOriginal = { ...item };
            }
        }
    },
    reagendar: (id) => { AgendaModule._isReagendamento = true; AgendaModule.editar(id); },
    cancelar: async (id) => {
        if (!await ConfirmModal.show('Deseja realmente cancelar este agendamento?')) return;
        try { LoadingUtils.show('Cancelando...'); await DataService.saveRecord('agenda', { status: 'Cancelado' }, id); await DataService.loadAgenda(AppState.paginacao.agenda.pagina); atualizarDashboard(); AlertUtils.show('Agendamento cancelado.', 'success'); } 
        catch (e) { ErrorHandler.handle('cancelar agenda', e); } finally { LoadingUtils.hide(); }
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este agendamento?')) return;
        try { LoadingUtils.show('Excluindo...'); await DataService.deleteRecord('agenda', id); await DataService.loadAgenda(AppState.paginacao.agenda.pagina); atualizarDashboard(); AlertUtils.show('Agendamento excluído', 'success'); } 
        catch (e) { ErrorHandler.handle('excluir agenda', e); } finally { LoadingUtils.hide(); }
    },
    realizarServico: async (id) => {
        const item = AppState.agenda.find(a => a.id == id);
        if (item) {
            DomUtils.setValue('servico-data', new Date(item.data_hora).toISOString().split('T')[0]);
            DomUtils.setValue('servico-cliente', item.cliente); DomUtils.setValue('servico-tatuador', item.tatuador_nome);
            DomUtils.setValue('servico-tipo', item.tipo_servico); DomUtils.setValue('servico-descricao', item.observacoes || '');
            DomUtils.setValue('servico-valor', item.valor_estimado || 0); DomUtils.setValue('servico-pagamento', item.forma_pagamento || 'PIX');
            ServicosModule.calcularRepasse(); pendingAgendaId = id; DomUtils.setDisplay('modal-servico', 'block');
        }
    },
    filtrar: () => DataService.loadAgenda(1),
    filtrarHoje: () => { DomUtils.setValue('filtro-data-agenda', DateUtils.nowDate()); DataService.loadAgenda(1); },
    limparFiltros: () => { DomUtils.setValue('filtro-tatuador-agenda', ''); DomUtils.setValue('filtro-status-agenda', ''); DomUtils.setValue('filtro-data-agenda', ''); DataService.loadAgenda(1); }
};

// ==================== GERAÇÃO DE PDF CORRIGIDA E ESTÁVEL ====================
async function gerarComprovanteAgendamentoPDF(dados) {
    if (!dados) return;
    let element = null;
    try {
        LoadingUtils.show('Gerando comprovante PDF...');
        if (typeof html2canvas === 'undefined') throw new Error('Biblioteca html2canvas não carregada.');
        if (typeof window.jspdf === 'undefined') throw new Error('Biblioteca jsPDF não carregada.');

        const { data: studio, error } = await supabaseClient
            .from('studio_config')
            .select('nome, endereco, instagram, whatsapp')
            .eq('id', 1)
            .maybeSingle();

        const nomeStudio = studio?.nome || 'DARK013TATTOO';
        const endereco = studio?.endereco || '';
        const instagram = studio?.instagram || '';
        const whatsapp = studio?.whatsapp || '';

        // Cria o elemento com fundo branco e texto preto
        element = document.createElement('div');
        element.style.cssText = 'background-color:#FFFFFF;color:#000000;font-family:Inter,sans-serif;padding:30px;border-radius:20px;max-width:600px;margin:0 auto;border:1px solid #CCCCCC;position:absolute;left:-9999px;top:0;';

        const dataHora = dados.data_hora instanceof Date ? dados.data_hora : new Date(dados.data_hora);
        const dataFormatada = isNaN(dataHora.getTime()) ? '-' : dataHora.toLocaleDateString('pt-BR');
        const horaFormatada = isNaN(dataHora.getTime()) ? '-' : dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const protocolo = `DARK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const clienteNome = dados.cliente || 'Cliente';
        const textoReagendamento = dados.reagendado ? '<p style="color:#D35400;font-weight:bold;margin-top:10px;">⚠️ Este é um REAGENDAMENTO</p>' : '';

        element.innerHTML = `
            <div style="text-align:center;margin-bottom:25px;">
                <h1 style="color:#000000;margin:0;font-size:28px;">${escapeHtml(nomeStudio)}</h1>
                ${endereco ? `<p style="color:#333333;margin:5px 0 0;font-size:14px;">${escapeHtml(endereco)}</p>` : ''}
                ${instagram ? `<p style="color:#333333;margin:2px 0 0;font-size:14px;">${escapeHtml(instagram)}</p>` : ''}
                ${whatsapp ? `<p style="color:#333333;margin:2px 0 0;font-size:14px;">WhatsApp: ${escapeHtml(whatsapp)}</p>` : ''}
                <p style="color:#555555;margin:15px 0 0;font-size:16px;">Comprovante de Agendamento</p>
                ${textoReagendamento}
            </div>
            <div style="border-top:1px solid #CCCCCC;padding:15px 0;">
                <p><strong>Protocolo:</strong> ${protocolo}</p>
                <p><strong>Data:</strong> ${dataFormatada} às ${horaFormatada}</p>
                <p><strong>Cliente:</strong> ${escapeHtml(clienteNome)}</p>
                <p><strong>Tatuador(a):</strong> ${escapeHtml(dados.tatuador_nome || 'N/A')}</p>
                <p><strong>Tipo:</strong> ${escapeHtml(dados.tipo_servico || 'N/A')}</p>
                <p><strong>Status:</strong> ${escapeHtml(dados.status || 'N/A')}</p>
                ${dados.observacoes ? `<p><strong>Obs:</strong> ${escapeHtml(dados.observacoes)}</p>` : ''}
            </div>
            <div style="border-top:1px solid #CCCCCC;margin-top:15px;padding-top:15px;text-align:center;font-size:12px;color:#666666;">
                <p>Em caso de cancelamento ou reagendar, avisar com 24h de antecedência.</p>
                <p>${escapeHtml(nomeStudio)} - Gestão Profissional</p>
            </div>`;

        document.body.appendChild(element);
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));

        const canvas = await html2canvas(element, { 
            scale: 2, 
            backgroundColor: '#FFFFFF',  // fundo branco
            logging: false, 
            useCORS: true 
        });
        document.body.removeChild(element);
        element = null;

        const imgData = canvas.toDataURL('image/png');
        const jsPDF = window.jspdf.jsPDF || window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgWidth = 190;
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const yPosition = (pageHeight - imgHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', 10, Math.max(10, yPosition), imgWidth, imgHeight);
        
        const safeFilename = clienteNome.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'cliente';
        const dataFile = dataFormatada.replace(/\//g, '-');
        pdf.save(`comprovante_${safeFilename}_${dataFile}.pdf`);
        
        AlertUtils.show('Comprovante PDF gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        ErrorHandler.handle('gerar PDF', error);
        AlertUtils.show('Erro ao gerar PDF: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
        if (element && element.parentNode) document.body.removeChild(element);
        LoadingUtils.hide();
    }
}

// ==================== ANÁLISE DE PIERCING ====================
async function carregarAnalisePiercing() {
    try {
        const { data: vendas, error } = await supabaseClient.from('vendas_piercing').select('data, quantidade, valor_total, piercing_id, piercing:piercings_estoque(nome, custo_unitario)').order('data', { ascending: false }).limit(1000);
        if (error) throw error;
        if (!vendas || vendas.length === 0) {
            DomUtils.setHtml('piercing-resumo', '<p style="color:#A0A0A0;">Nenhuma venda registrada.</p>');
            const chartCanvas = DomUtils.get('chart-piercing-vendas');
            if (chartCanvas) { const ctx = chartCanvas.getContext('2d'); if (AppState.piercingChart) AppState.piercingChart.destroy(); ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height); }
            return;
        }
        const totalVendas = vendas.reduce((sum, v) => sum + MoneyUtils.parse(v.valor_total), 0);
        const totalCusto = vendas.reduce((sum, v) => sum + ((v.piercing?.custo_unitario || 0) * v.quantidade), 0);
        const lucro = totalVendas - totalCusto; const margem = totalVendas > 0 ? ((lucro / totalVendas) * 100).toFixed(1) : 0;
        const vendasPorPiercing = {}; vendas.forEach(v => { const nome = v.piercing?.nome || 'Desconhecido'; vendasPorPiercing[nome] = (vendasPorPiercing[nome] || 0) + v.quantidade; });
        const maisVendido = Object.entries(vendasPorPiercing).sort((a, b) => b[1] - a[1])[0];
        DomUtils.setHtml('piercing-resumo', `<div style="background:#2a2a3a;border-radius:8px;padding:12px;flex:1;text-align:center;"><div style="color:#A0A0A0;">Vendas Totais</div><div style="font-size:1.5rem;font-weight:bold;">${MoneyUtils.format(totalVendas)}</div></div><div style="background:#2a2a3a;border-radius:8px;padding:12px;flex:1;text-align:center;"><div style="color:#A0A0A0;">Custo Total</div><div style="font-size:1.5rem;font-weight:bold;color:#F87171;">${MoneyUtils.format(totalCusto)}</div></div><div style="background:#2a2a3a;border-radius:8px;padding:12px;flex:1;text-align:center;"><div style="color:#A0A0A0;">Lucro</div><div style="font-size:1.5rem;font-weight:bold;color:#34D399;">${MoneyUtils.format(lucro)}</div><div style="font-size:0.8rem;color:#A0A0A0;">Margem ${margem}%</div></div><div style="background:#2a2a3a;border-radius:8px;padding:12px;flex:1;text-align:center;"><div style="color:#A0A0A0;">Mais Vendido</div><div style="font-size:1.2rem;font-weight:bold;">${escapeHtml(maisVendido ? maisVendido[0] : '-')}</div><div style="font-size:0.9rem;">${maisVendido ? maisVendido[1] + ' un.' : ''}</div></div>`);
        const mesesLabels = []; const valoresMensais = []; const hoje = new Date();
        for (let i = 5; i >= 0; i--) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const anoMes = data.toISOString().slice(0, 7);
            mesesLabels.push(data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
            valoresMensais.push(vendas.filter(v => v.data && v.data.startsWith(anoMes)).reduce((sum, v) => sum + MoneyUtils.parse(v.valor_total), 0));
        }
        const canvas = DomUtils.get('chart-piercing-vendas'); if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (AppState.piercingChart) AppState.piercingChart.destroy();
        AppState.piercingChart = new Chart(ctx, { type: 'bar', data: { labels: mesesLabels, datasets: [{ label: 'Vendas (R$)', data: valoresMensais, backgroundColor: '#C084FC', borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#A0A0A0' } }, x: { ticks: { color: '#A0A0A0' } } } } });
    } catch (e) { console.error('Erro ao carregar análise de piercing:', e); }
}

// ==================== MÓDULO MATERIAIS ====================
const MateriaisModule = {
    abrirModal: (id = null) => {
        DomUtils.clearForm('form-material');
        if (id) {
            supabaseClient.from('materiais_estoque').select('*').eq('id', id).single().then(({ data }) => {
                if (data) {
                    DomUtils.setValue('material-id', data.id);
                    DomUtils.setValue('material-nome', data.nome);
                    DomUtils.setValue('material-qtd', data.quantidade);
                    DomUtils.setValue('material-preco', data.valor_unitario);
                    DomUtils.setDisplay('modal-material', 'block');
                }
            }).catch(e => ErrorHandler.handle('carregar material', e));
        } else {
            DomUtils.setDisplay('modal-material', 'block');
        }
    },
    salvar: async () => {
        const id = DomUtils.getValue('material-id');
        const nome = DomUtils.getValue('material-nome');
        let quantidade = parseInt(DomUtils.getValue('material-qtd')) || 0;
        const valor_unitario = MoneyUtils.parse(DomUtils.getValue('material-preco'));
        if (!nome) return AlertUtils.show('Nome obrigatório', 'error');
        if (valor_unitario <= 0) return AlertUtils.show('Valor unitário deve ser maior que zero.', 'error');
        if (quantidade < 0) return AlertUtils.show('Quantidade não pode ser negativa.', 'error');

        try {
            LoadingUtils.show('Salvando...');
            let quantidadeAnterior = 0;
            if (id) {
                const { data } = await supabaseClient.from('materiais_estoque').select('quantidade').eq('id', id).single();
                quantidadeAnterior = data?.quantidade || 0;
            }
            await DataService.saveRecord('materiais_estoque', { nome, quantidade, valor_unitario }, id || null);
            const dataHoje = DateUtils.nowDate();
            if (!id) {
                if (quantidade * valor_unitario > 0) await registrarSaidaCaixa(dataHoje, quantidade * valor_unitario, `Compra inicial: ${quantidade} un. de ${nome}`);
            } else {
                const diferenca = quantidade - quantidadeAnterior;
                if (diferenca > 0) await registrarSaidaCaixa(dataHoje, diferenca * valor_unitario, `Adição ao estoque: +${diferenca} un. de ${nome}`);
                else if (diferenca < 0) AlertUtils.show(`Estoque reduzido em ${-diferenca} un. sem lançamento financeiro.`, 'info');
            }
            DomUtils.setDisplay('modal-material', 'none');
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais(1, 10);
            AlertUtils.show('Material salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar material', e); } finally { LoadingUtils.hide(); }
    },
    editar: (id) => MateriaisModule.abrirModal(id),
    excluir: async (id) => {
        const { count, error } = await supabaseClient.from('usos_materiais').select('*', { count: 'exact', head: true }).eq('material_id', id);
        if (error) { ErrorHandler.handle('verificar usos do material', error); return; }
        if (count > 0) { AlertUtils.show('Este material possui registros de uso e não pode ser excluído.', 'error'); return; }
        if (!await ConfirmModal.show('Excluir este material?')) return;
        try { await DataService.deleteRecord('materiais_estoque', id); await DataService.loadMateriais(); await DataService.loadUsosMateriais(1, 10); AlertUtils.show('Material excluído', 'success'); } catch (e) { ErrorHandler.handle('excluir material', e); }
    },
    registrarUso: async () => {
        const materialId = DomUtils.getValue('uso-material-id');
        const quantidade = parseInt(DomUtils.getValue('uso-qtd')) || 0;
        const observacao = DomUtils.getValue('uso-obs')?.trim() || null;
        if (!materialId) return AlertUtils.show('Selecione um material', 'error');
        if (quantidade <= 0) return AlertUtils.show('Quantidade deve ser maior que zero', 'error');

        try {
            LoadingUtils.show('Registrando uso...');
            const { data: material, error: fetchError } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
            if (fetchError || !material) throw new Error('Material não encontrado');
            if (material.quantidade < quantidade) throw new Error(`Estoque insuficiente. Disponível: ${material.quantidade}`);
            const novaQuantidade = material.quantidade - quantidade;
            await supabaseClient.from('materiais_estoque').update({ quantidade: novaQuantidade }).eq('id', materialId);
            await supabaseClient.from('usos_materiais').insert([{ material_id: materialId, quantidade, observacao, data: new Date().toISOString() }]);
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais(AppState.paginacao.usosMateriais.pagina, 10);
            DomUtils.setValue('uso-qtd', '1'); DomUtils.setValue('uso-obs', '');
            AlertUtils.show(`Uso de ${quantidade} unidade(s) registrado com sucesso.`, 'success');
        } catch (e) { ErrorHandler.handle('uso material', e); AlertUtils.show(e.message || 'Erro ao registrar uso.', 'error'); } finally { LoadingUtils.hide(); }
    },
    editarUso: async (id) => {
        const uso = AppState.usosMateriais.find(u => u.id == id);
        if (!uso) { AlertUtils.show('Uso não encontrado', 'error'); return; }
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `<div class="modal-content" style="max-width:450px;"><span class="close" data-modal="modal-editar-uso">&times;</span><h3><i class="fas fa-edit"></i> Editar Uso de Material</h3><form id="form-editar-uso"><div class="form-group"><label>Quantidade</label><input type="number" id="edit-uso-qtd" value="${uso.quantidade}" step="1" min="1" required></div><div class="form-group"><label>Observação</label><textarea id="edit-uso-obs" rows="2">${escapeHtml(uso.observacao || '')}</textarea></div><div class="modal-actions" style="display:flex; gap:12px; justify-content:flex-end; margin-top:20px;"><button type="button" class="btn btn-secondary" id="cancel-edit-uso">Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button></div></form></div>`;
        document.body.appendChild(modal);
        const closeModal = () => modal.remove();
        modal.querySelector('.close').addEventListener('click', closeModal);
        modal.querySelector('#cancel-edit-uso').addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        modal.querySelector('#form-editar-uso').addEventListener('submit', async (e) => {
            e.preventDefault();
            const novaQuantidade = parseInt(modal.querySelector('#edit-uso-qtd').value);
            const novaObs = modal.querySelector('#edit-uso-obs').value.trim() || null;
            if (isNaN(novaQuantidade) || novaQuantidade <= 0) { AlertUtils.show('Quantidade inválida', 'error'); return; }
            try {
                LoadingUtils.show('Atualizando uso...');
                const { data: material } = await supabaseClient.from('materiais_estoque').select('*').eq('id', uso.material_id).single();
                if (!material) throw new Error('Material não encontrado');
                const diferenca = novaQuantidade - uso.quantidade;
                const novaQuantidadeEstoque = material.quantidade - diferenca;
                if (novaQuantidadeEstoque < 0) throw new Error('Estoque ficaria negativo após ajuste');
                await supabaseClient.from('usos_materiais').update({ quantidade: novaQuantidade, observacao: novaObs }).eq('id', id);
                await supabaseClient.from('materiais_estoque').update({ quantidade: novaQuantidadeEstoque }).eq('id', uso.material_id);
                await DataService.loadMateriais();
                await DataService.loadUsosMateriais(AppState.paginacao.usosMateriais.pagina, 10);
                AlertUtils.show('Uso atualizado com sucesso', 'success');
                closeModal();
            } catch (e) { ErrorHandler.handle('editar uso material', e); AlertUtils.show(e.message, 'error'); } finally { LoadingUtils.hide(); }
        });
    },
    excluirUso: async (id) => {
        if (!await ConfirmModal.show('Excluir este registro de uso? O material será devolvido ao estoque (sem alteração financeira).')) return;
        const uso = AppState.usosMateriais.find(u => u.id == id);
        if (!uso) { AlertUtils.show('Uso não encontrado', 'error'); return; }
        try {
            LoadingUtils.show('Excluindo uso...');
            const { data: material } = await supabaseClient.from('materiais_estoque').select('*').eq('id', uso.material_id).single();
            if (!material) throw new Error('Material não encontrado');
            const novaQuantidade = material.quantidade + uso.quantidade;
            await supabaseClient.from('materiais_estoque').update({ quantidade: novaQuantidade }).eq('id', uso.material_id);
            await supabaseClient.from('usos_materiais').delete().eq('id', id);
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais(AppState.paginacao.usosMateriais.pagina, 10);
            AlertUtils.show('Uso excluído e estoque ajustado', 'success');
        } catch (e) { ErrorHandler.handle('excluir uso material', e); } finally { LoadingUtils.hide(); }
    },
    aplicarFiltroUsos: () => {
        AppState.filtrosUsosMateriais.materialId = DomUtils.getValue('filtro-uso-material') || '';
        AppState.filtrosUsosMateriais.dataInicio = DomUtils.getValue('filtro-uso-data-inicio') || '';
        AppState.filtrosUsosMateriais.dataFim = DomUtils.getValue('filtro-uso-data-fim') || '';
        DataService.loadUsosMateriais(1, 10);
    },
    limparFiltrosUsos: () => {
        AppState.filtrosUsosMateriais = { materialId: '', dataInicio: '', dataFim: '' };
        DomUtils.setValue('filtro-uso-material', ''); DomUtils.setValue('filtro-uso-data-inicio', ''); DomUtils.setValue('filtro-uso-data-fim', '');
        DataService.loadUsosMateriais(1, 10);
    },
    atualizarCustoUso: () => {
        const select = DomUtils.get('uso-material-id');
        const selectedOption = select?.options[select.selectedIndex];
        if (selectedOption && selectedOption.dataset.custo) {
            const custoUnitario = MoneyUtils.parse(selectedOption.dataset.custo);
            const quantidade = parseInt(DomUtils.getValue('uso-qtd')) || 0;
            const total = custoUnitario * quantidade;
            const spanCusto = DomUtils.get('uso-custo-total');
            if (spanCusto) spanCusto.innerText = MoneyUtils.format(total);
        }
    }
};

// ==================== DEMAIS MÓDULOS (Piercing, Backup, Config, Exemplos) ====================
const PiercingModule = {
    abrirModal: (id = null) => { 
        DomUtils.clearForm('form-piercing'); 
        if (id) { 
            supabaseClient.from('piercings_estoque').select('*').eq('id', id).single().then(({ data }) => { 
                if (data) { 
                    DomUtils.setValue('piercing-id', data.id); DomUtils.setValue('piercing-nome', data.nome); 
                    DomUtils.setValue('piercing-qtd', data.quantidade); DomUtils.setValue('piercing-preco', data.preco_venda); 
                    DomUtils.setValue('piercing-custo', data.custo_unitario || 0); DomUtils.setDisplay('modal-piercing', 'block'); 
                } 
            }).catch(e => ErrorHandler.handle('carregar piercing', e)); 
        } else DomUtils.setDisplay('modal-piercing', 'block'); 
    },
    salvar: async () => {
        const id = DomUtils.getValue('piercing-id'), nome = DomUtils.getValue('piercing-nome');
        const quantidade = parseInt(DomUtils.getValue('piercing-qtd')) || 0; 
        const preco_venda = MoneyUtils.parse(DomUtils.getValue('piercing-preco')); 
        const custo_unitario = MoneyUtils.parse(DomUtils.getValue('piercing-custo'));
        if (!nome) return AlertUtils.show('Nome obrigatório', 'error'); 
        if (!id && (!custo_unitario || custo_unitario <= 0)) return AlertUtils.show('Para novo piercing, o Valor de Custo é obrigatório', 'error');
        try {
            LoadingUtils.show('Salvando...'); 
            let quantidadeAnterior = 0; 
            if (id) { const { data } = await supabaseClient.from('piercings_estoque').select('quantidade').eq('id', id).single(); quantidadeAnterior = data?.quantidade || 0; }
            await DataService.saveRecord('piercings_estoque', { nome, quantidade, preco_venda, custo_unitario }, id || null);
            const dataHoje = DateUtils.nowDate();
            if (!id) { if (quantidade * custo_unitario > 0) await registrarSaidaCaixa(dataHoje, quantidade * custo_unitario, `Compra: ${quantidade} un. de ${nome}`); }
            else { const aumento = quantidade - quantidadeAnterior; if (aumento > 0 && aumento * custo_unitario > 0) await registrarSaidaCaixa(dataHoje, aumento * custo_unitario, `Adição ao estoque: +${aumento} un. de ${nome}`); }
            DomUtils.setDisplay('modal-piercing', 'none'); 
            await DataService.loadPiercings(); await DataService.loadVendasPiercing(); await carregarAnalisePiercing(); 
            AlertUtils.show('Piercing salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar piercing', e); } finally { LoadingUtils.hide(); }
    },
    editar: (id) => PiercingModule.abrirModal(id),
    excluir: async (id) => { 
        if (!await ConfirmModal.show('Excluir este piercing?')) return; 
        try { await DataService.deleteRecord('piercings_estoque', id); await DataService.loadPiercings(); await DataService.loadVendasPiercing(); await carregarAnalisePiercing(); AlertUtils.show('Piercing excluído', 'success'); } 
        catch (e) { ErrorHandler.handle('excluir piercing', e); } 
    },
    registrarVenda: async () => {
        const piercingId = DomUtils.getValue('venda-piercing-id'), quantidade = parseInt(DomUtils.getValue('venda-qtd')) || 0, cliente = DomUtils.getValue('venda-cliente');
        if (!piercingId) return AlertUtils.show('Selecione um piercing', 'error'); 
        if (quantidade <= 0) return AlertUtils.show('Quantidade deve ser maior que zero', 'error');
        try {
            LoadingUtils.show('Registrando venda...'); 
            const { data: piercing } = await supabaseClient.from('piercings_estoque').select('*').eq('id', piercingId).single();
            if (!piercing || piercing.quantidade < quantidade) throw new Error('Estoque insuficiente');
            const valorTotal = quantidade * piercing.preco_venda;
            await supabaseClient.from('piercings_estoque').update({ quantidade: piercing.quantidade - quantidade }).eq('id', piercingId);
            await supabaseClient.from('vendas_piercing').insert([{ piercing_id: piercingId, quantidade, valor_total: valorTotal, cliente: cliente || null, data: getLocalDateString() }]);
            if (valorTotal > 0) await registrarEntradaCaixa(DateUtils.nowDate(), valorTotal, `Venda: ${quantidade} un. de ${piercing.nome}${cliente ? ' - ' + cliente : ''}`);
            await DataService.loadPiercings(); await DataService.loadVendasPiercing(); await carregarAnalisePiercing();
            DomUtils.setValue('venda-qtd', 1); DomUtils.setValue('venda-cliente', ''); 
            AlertUtils.show(`Venda registrada: ${MoneyUtils.format(valorTotal)}`, 'success');
        } catch (e) { ErrorHandler.handle('venda piercing', e); } finally { LoadingUtils.hide(); }
    }
};

const BackupModule = {
    exportar: async () => {
        try { 
            LoadingUtils.show('Gerando backup...'); 
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais']; 
            const backup = { data_exportacao: new Date().toISOString() }; 
            for (const t of tabelas) { const { data } = await supabaseClient.from(t).select('*'); backup[t] = data || []; } 
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); 
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup-dark013-${DateUtils.nowDate()}.json`; a.click(); 
            AlertUtils.show('Backup exportado', 'success'); 
        } catch (e) { ErrorHandler.handle('exportar backup', e); } finally { LoadingUtils.hide(); }
    },
    importar: async (input) => {
        const file = input.files[0]; if (!file) return;
        try { 
            LoadingUtils.show('Importando...'); 
            const text = await file.text(); const backup = JSON.parse(text); 
            if (!backup.servicos) throw new Error('Arquivo inválido'); 
            if (!await ConfirmModal.show(`Importar backup de ${backup.data_exportacao}? Pode duplicar dados.`)) return; 
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais']; 
            for (const t of tabelas) { 
                const registros = backup[t] || []; 
                for (const reg of registros) { const { id, ...rest } = reg; await supabaseClient.from(t).insert([rest]); } 
            } 
            AlertUtils.show('Backup importado com sucesso', 'success'); 
            setTimeout(() => location.reload(), 1500); 
        } catch (e) { ErrorHandler.handle('importar backup', e); } finally { LoadingUtils.hide(); input.value = ''; }
    }
};

const ExemplosModule = {
    popularPiercings: async () => { 
        if (!await ConfirmModal.show('Adicionar piercings de exemplo?')) return; 
        const exemplos = [{ nome: 'Piercing Nariz Cristal', quantidade: 10, preco_venda: 80.00, custo_unitario: 25.00 }, { nome: 'Piercing Septo Aço', quantidade: 8, preco_venda: 120.00, custo_unitario: 35.00 }, { nome: 'Piercing Lábio Argola', quantidade: 5, preco_venda: 70.00, custo_unitario: 20.00 }]; 
        try { 
            LoadingUtils.show('Adicionando...'); 
            for (const item of exemplos) { const { data: existente } = await supabaseClient.from('piercings_estoque').select('id').eq('nome', item.nome).maybeSingle(); if (!existente) await supabaseClient.from('piercings_estoque').insert([item]); } 
            await DataService.loadPiercings(); await DataService.loadVendasPiercing(); await carregarAnalisePiercing(); 
            AlertUtils.show('Exemplos adicionados!', 'success'); 
        } catch (e) { ErrorHandler.handle('exemplos piercings', e); } finally { LoadingUtils.hide(); } 
    },
    popularMateriais: async () => { 
        if (!await ConfirmModal.show('Adicionar materiais de exemplo?')) return; 
        const exemplos = [{ nome: 'Agulha 1207RL', quantidade: 50, valor_unitario: 2.50 }, { nome: 'Tinta Preta Intenze', quantidade: 8, valor_unitario: 45.00 }, { nome: 'Luvas Descartáveis M', quantidade: 100, valor_unitario: 0.80 }]; 
        try { 
            LoadingUtils.show('Adicionando...'); 
            for (const item of exemplos) { const { data: existente } = await supabaseClient.from('materiais_estoque').select('id').eq('nome', item.nome).maybeSingle(); if (!existente) await supabaseClient.from('materiais_estoque').insert([item]); } 
            await DataService.loadMateriais(); await DataService.loadUsosMateriais(1, 10); 
            AlertUtils.show('Exemplos adicionados!', 'success'); 
        } catch (e) { ErrorHandler.handle('exemplos materiais', e); } finally { LoadingUtils.hide(); } 
    }
};

const ConfigModule = {
    abrirModal: async () => { DomUtils.setValue('config-repasse-estudio', AppState.config.repasseEstudio); DomUtils.setDisplay('modal-config-repasse', 'block'); },
    salvar: async () => { 
        const novoValor = parseInt(DomUtils.getValue('config-repasse-estudio')); 
        if (isNaN(novoValor) || novoValor < 0 || novoValor > 100) { AlertUtils.show('Porcentagem inválida (0-100).', 'error'); return; } 
        try { 
            LoadingUtils.show('Salvando configuração...'); 
            const { error } = await supabaseClient.from('studio_config').update({ repasse_porcentagem_estudio: novoValor }).eq('id', 1); 
            if (error) throw error; 
            AppState.config.repasseEstudio = novoValor; 
            DomUtils.setDisplay('modal-config-repasse', 'none'); 
            AlertUtils.show('Porcentagem padrão atualizada!', 'success'); 
        } catch (e) { ErrorHandler.handle('salvar config repasse', e); } finally { LoadingUtils.hide(); } 
    }
};

// ==================== INICIALIZAÇÃO ====================
async function testarConexao() {
    const statusEl = DomUtils.get('status-nuvem');
    if (!supabaseClient) { if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Cliente não inicializado'; return false; }
    try { 
        const { error } = await supabaseClient.from('caixa').select('id').limit(1); 
        if (error) throw error; 
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Conectado ao Supabase'; statusEl.className = 'status-badge status-connected'; } 
        return true; 
    } catch (err) { 
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Falha na conexão'; statusEl.className = 'status-badge status-error'; } 
        ErrorHandler.handle('conexão', err); return false; 
    }
}

async function carregarDadosPrincipais() {
    await DataService.loadCaixa(1, 10, ''); await DataService.loadServicos(1, 10); await DataService.loadAgenda(1, 10);
    await DataService.loadPiercings(); await DataService.loadVendasPiercing(); await carregarAnalisePiercing();
    await DataService.loadMateriais(); await DataService.loadUsosMateriais(1, 10); await atualizarDashboard(); await carregarRelatorios();
}

async function carregarDadosSecao(sectionId) {
    const map = {
        dashboard: async () => { await DataService.loadAllServicos(); await DataService.loadAllCaixa(); await DataService.loadAgenda(1,10); atualizarDashboard(); },
        caixa: () => DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || ''),
        servicos: () => DataService.loadServicos(1, 10),
        agenda: () => DataService.loadAgenda(1, 10),
        relatorios: () => carregarRelatorios(),
        piercing: async () => { await DataService.loadPiercings(); await DataService.loadVendasPiercing(); await carregarAnalisePiercing(); },
        materiais: async () => { await DataService.loadMateriais(); await DataService.loadUsosMateriais(1, 10); }
    };
    if (map[sectionId]) await map[sectionId]();
}

function setupEventListeners() {
    document.querySelectorAll('.nav button').forEach(btn => btn.addEventListener('click', () => {
        const sectionId = btn.getAttribute('data-section');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const target = DomUtils.get(sectionId); if (target) target.classList.add('active');
        document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        carregarDadosSecao(sectionId);
    }));
    document.querySelectorAll('.close').forEach(close => close.addEventListener('click', () => { const modalId = close.getAttribute('data-modal'); if (modalId) { DomUtils.setDisplay(modalId, 'none'); if (modalId === 'modal-servico') pendingAgendaId = null; } }));
    
    DomUtils.get('btn-novo-caixa')?.addEventListener('click', () => CaixaModule.abrirModal());
    DomUtils.get('btn-salvar-caixa')?.addEventListener('click', () => CaixaModule.salvar());
    DomUtils.get('search-caixa')?.addEventListener('input', () => CaixaModule.filtrar());
    DomUtils.get('btn-filtrar-caixa')?.addEventListener('click', () => CaixaModule.aplicarFiltroPeriodo());
    DomUtils.get('btn-limpar-filtros-caixa')?.addEventListener('click', () => CaixaModule.limparFiltros());
    
    DomUtils.get('btn-novo-servico')?.addEventListener('click', () => { pendingAgendaId = null; ServicosModule.abrirModal(); });
    DomUtils.get('btn-salvar-servico')?.addEventListener('click', () => ServicosModule.salvar());
    DomUtils.get('limpar-filtros-servicos')?.addEventListener('click', () => ServicosModule.limparFiltros());
    DomUtils.get('search-servicos')?.addEventListener('input', () => ServicosModule.filtrar());
    ['filtro-tatuador-servico', 'filtro-tipo-servico', 'filtro-pagamento', 'filtro-data-servico'].forEach(id => DomUtils.get(id)?.addEventListener('change', () => ServicosModule.filtrar()));
    DomUtils.get('servico-tatuador')?.addEventListener('change', () => ServicosModule.calcularRepasse());
    DomUtils.get('servico-valor')?.addEventListener('input', () => ServicosModule.calcularRepasse());
    
    DomUtils.get('btn-novo-agendamento')?.addEventListener('click', () => AgendaModule.abrirModal());
    DomUtils.get('btn-salvar-agenda')?.addEventListener('click', () => AgendaModule.salvar());
    DomUtils.get('filtrar-agenda-hoje')?.addEventListener('click', () => AgendaModule.filtrarHoje());
    DomUtils.get('limpar-filtros-agenda')?.addEventListener('click', () => AgendaModule.limparFiltros());
    ['filtro-tatuador-agenda', 'filtro-status-agenda', 'filtro-data-agenda'].forEach(id => DomUtils.get(id)?.addEventListener('change', () => AgendaModule.filtrar()));
    
    DomUtils.get('btn-add-piercing')?.addEventListener('click', () => PiercingModule.abrirModal());
    DomUtils.get('btn-salvar-piercing')?.addEventListener('click', () => PiercingModule.salvar());
    DomUtils.get('btn-registrar-venda')?.addEventListener('click', () => PiercingModule.registrarVenda());
    DomUtils.get('btn-popular-piercings')?.addEventListener('click', () => ExemplosModule.popularPiercings());
    
    DomUtils.get('btn-add-material')?.addEventListener('click', () => MateriaisModule.abrirModal());
    DomUtils.get('btn-salvar-material')?.addEventListener('click', () => MateriaisModule.salvar());
    DomUtils.get('btn-usar-material')?.addEventListener('click', () => MateriaisModule.registrarUso());
    DomUtils.get('btn-popular-materiais')?.addEventListener('click', () => ExemplosModule.popularMateriais());
    DomUtils.get('btn-filtrar-usos')?.addEventListener('click', () => MateriaisModule.aplicarFiltroUsos());
    DomUtils.get('btn-limpar-filtros-usos')?.addEventListener('click', () => MateriaisModule.limparFiltrosUsos());
    DomUtils.get('uso-material-id')?.addEventListener('change', () => MateriaisModule.atualizarCustoUso());
    DomUtils.get('uso-qtd')?.addEventListener('input', () => MateriaisModule.atualizarCustoUso());
    
    DomUtils.get('btn-exportar-backup')?.addEventListener('click', () => BackupModule.exportar());
    DomUtils.get('btn-importar-backup')?.addEventListener('click', () => document.getElementById('import-backup')?.click());
    DomUtils.get('import-backup')?.addEventListener('change', (e) => BackupModule.importar(e.target));
    DomUtils.get('btn-config-repasse')?.addEventListener('click', () => ConfigModule.abrirModal());
    DomUtils.get('btn-salvar-config-repasse')?.addEventListener('click', () => ConfigModule.salvar());
    DomUtils.get('btn-sincronizar')?.addEventListener('click', () => location.reload());
    
    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const acao = btn.dataset.acao, id = btn.dataset.id;
        if (acao === 'editar-caixa') CaixaModule.editar(id);
        else if (acao === 'excluir-caixa') CaixaModule.excluir(id);
        else if (acao === 'editar-servico') ServicosModule.editar(id);
        else if (acao === 'excluir-servico') ServicosModule.excluir(id);
        else if (acao === 'realizar-servico') AgendaModule.realizarServico(id);
        else if (acao === 'reagendar-agenda') AgendaModule.reagendar(id);
        else if (acao === 'cancelar-agenda') AgendaModule.cancelar(id);
        else if (acao === 'editar-agenda') AgendaModule.editar(id);
        else if (acao === 'excluir-agenda') AgendaModule.excluir(id);
        else if (acao === 'editar-piercing') PiercingModule.editar(id);
        else if (acao === 'excluir-piercing') PiercingModule.excluir(id);
        else if (acao === 'editar-material') MateriaisModule.editar(id);
        else if (acao === 'excluir-material') MateriaisModule.excluir(id);
        else if (acao === 'editar-uso-material') MateriaisModule.editarUso(id);
        else if (acao === 'excluir-uso-material') MateriaisModule.excluirUso(id);
    });
}

async function inicializarApp() {
    const conectado = await testarConexao();
    if (conectado) { await carregarConfiguracoes(); await carregarDadosPrincipais(); setupEventListeners(); }
}

async function carregarConfiguracoes() {
    try { 
        const { data, error } = await supabaseClient.from('studio_config').select('repasse_porcentagem_estudio').eq('id', 1).single(); 
        if (error) throw error; 
        if (data && data.repasse_porcentagem_estudio != null) AppState.config.repasseEstudio = Number(data.repasse_porcentagem_estudio); 
    } catch (e) { console.warn('Usando valor padrão de repasse:', e); }
}

document.addEventListener('DOMContentLoaded', checkSession);