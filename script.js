// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou.');
}

// ==================== UTILITÁRIOS ====================
const DomUtils = {
    get: (id) => document.getElementById(id),
    setHtml: (id, html) => { const el = DomUtils.get(id); if (el) el.innerHTML = html; },
    setValue: (id, value) => { const el = DomUtils.get(id); if (el) el.value = value; },
    getValue: (id) => DomUtils.get(id)?.value,
    setDisplay: (id, display) => { const el = DomUtils.get(id); if (el) el.style.display = display; },
    clearForm: (formId) => { const form = DomUtils.get(formId); if (form) form.reset(); },
};

const DateUtils = {
    formatDate: (date) => date ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
    formatDateTime: (date) => {
        if (!date) return '-';
        const dt = new Date(date);
        if (isNaN(dt.getTime())) return '-';
        return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    },
    nowDate: () => new Date().toISOString().split('T')[0]
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
    _overlay: null,
    show: (message = 'Carregando...') => {
        let overlay = DomUtils.get('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter: blur(4px);';
            overlay.innerHTML = '<div style="background:#1e1e2a; padding:20px 32px; border-radius:40px; color:white;"><i class="fas fa-spinner fa-pulse"></i> <span id="loading-message">Carregando...</span></div>';
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
        modal.innerHTML = `
            <div class="modal-content confirm-modal" style="max-width:400px; text-align:center;">
                <h3><i class="fas fa-question-circle"></i> Confirmação</h3>
                <p id="confirm-message"></p>
                <div class="modal-actions" style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
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
        if (ConfirmModal._resolve) { ConfirmModal._resolve(result); ConfirmModal._resolve = null; }
    }
};

// ==================== ESTADO GLOBAL ====================
const AppState = {
    servicos: [], agenda: [], caixa: [],
    chartFaturamento: null, chartTipos: null,
    paginacao: { caixa: { pagina: 1, itensPorPagina: 10, total: 0 }, servicos: { pagina: 1, itensPorPagina: 10, total: 0 }, agenda: { pagina: 1, itensPorPagina: 10, total: 0 } }
};

// ==================== SERVIÇO DE DADOS ====================
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
        let error;
        if (id) ({ error } = await supabaseClient.from(table).update(record).eq('id', id));
        else ({ error } = await supabaseClient.from(table).insert([record]));
        if (error) throw error;
    },
    async deleteRecord(table, id) {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;
    },
    async loadCaixa(pagina = 1, itensPorPagina = 10, searchTerm = '') {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const filters = searchTerm ? { descricao: searchTerm } : {};
            const { data, count } = await this.fetchTable('caixa', 'data', false, itensPorPagina, offset, filters);
            AppState.caixa = data;
            AppState.paginacao.caixa.total = count;
            AppState.paginacao.caixa.pagina = pagina;
            Renderer.renderCaixa(AppState.caixa);
            Renderer.renderPaginacao('caixa', count, pagina, itensPorPagina, (novaPagina) => {
                const termo = DomUtils.getValue('search-caixa') || '';
                DataService.loadCaixa(novaPagina, itensPorPagina, termo);
            });
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
            query = query.order('data_hora', { ascending: true }).range(offset, offset + itensPorPagina - 1);
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
    async loadUsosMateriais() { try { const { data } = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data', { ascending: false }).limit(100); Renderer.renderUsosMateriais(data || []); } catch (e) { ErrorHandler.handle('loadUsosMateriais', e); } }
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
        container.querySelectorAll('button[data-pagina]').forEach(btn => btn.addEventListener('click', () => { const np = parseInt(btn.dataset.pagina); if (!isNaN(np)) callback(np); }));
    },
    renderCaixa(data) {
        const linhas = data.map(item => {
            const ent = MoneyUtils.parse(item.entradas), sai = MoneyUtils.parse(item.saidas);
            const icon = ent > 0 ? '↑' : (sai > 0 ? '↓' : '•');
            return `<tr><td>${DateUtils.formatDate(item.data)}</td>
                <td style="color:#34D399; font-weight:600;">${icon} ${MoneyUtils.format(ent)}</td>
                <td style="color:#F87171; font-weight:600;">${icon} ${MoneyUtils.format(sai)}</td>
                <td title="${escapeHtml(item.descricao)}" style="max-width:250px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.descricao) || '-'}</td>
                <td class="actions-cell"><button class="btn-icon" data-acao="editar-caixa" data-id="${item.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" data-acao="excluir-caixa" data-id="${item.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td></tr>`;
        }).join('');
        this._renderTable('caixa-tbody', data.length ? linhas : null);
    },
    renderServicos(data) {
        let totalValor = 0, totalEstudio = 0, totalRepasse = 0;
        const linhas = data.map(s => {
            const val = MoneyUtils.parse(s.valor_total);
            const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : val;
            const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : 0;
            totalValor += val; totalEstudio += estudio; totalRepasse += repasse;
            return `<tr><td>${DateUtils.formatDate(s.data)}</td><td>${escapeHtml(s.cliente)}</td><td>${escapeHtml(s.tatuador_nome)}</td>
                <td>${escapeHtml(s.tipo)}</td><td title="${escapeHtml(s.descricao)}">${escapeHtml(s.descricao) || '-'}</td>
                <td class="valor">${MoneyUtils.format(val)}</td><td class="valor">${MoneyUtils.format(estudio)}</td>
                <td class="valor repasse">${MoneyUtils.format(repasse)}</td><td>${escapeHtml(s.forma_pagamento)}</td>
                <td class="actions-cell"><button class="btn-icon" data-acao="editar-servico" data-id="${s.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" data-acao="excluir-servico" data-id="${s.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td></tr>`;
        }).join('');
        this._renderTable('servicos-tbody', data.length ? linhas : null);
        DomUtils.setHtml('servicos-total-valor', MoneyUtils.format(totalValor));
        DomUtils.setHtml('servicos-total-estudio', MoneyUtils.format(totalEstudio));
        DomUtils.setHtml('servicos-total-repasse', MoneyUtils.format(totalRepasse));
    },
    renderAgenda(data) {
        const linhas = data.map(a => {
            const statusClass = { Agendado: 'status-warning', Confirmado: 'status-info', Concluído: 'status-success', Cancelado: 'status-danger' }[a.status] || '';
            const realizarBtn = (a.status !== 'Concluído' && a.status !== 'Cancelado') ? `<button class="btn-icon" data-acao="realizar-servico" data-id="${a.id}" title="Realizar Serviço"><i class="fas fa-check-circle"></i></button>` : '';
            const dt = new Date(a.data_hora);
            const dataStr = !isNaN(dt.getTime()) ? dt.toLocaleDateString('pt-BR') : '-';
            const horaStr = !isNaN(dt.getTime()) ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
            return `<tr><td>${dataStr}</td><td>${horaStr}</td><td>${escapeHtml(a.cliente)}</td><td>${escapeHtml(a.tatuador_nome)}</td>
                <td>${escapeHtml(a.tipo_servico)}</td><td><span class="status-badge-item ${statusClass}">${escapeHtml(a.status)}</span></td>
                <td title="${escapeHtml(a.observacoes)}">${escapeHtml(a.observacoes) || '-'}</td>
                <td class="actions-cell">${realizarBtn}<button class="btn-icon" data-acao="editar-agenda" data-id="${a.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" data-acao="excluir-agenda" data-id="${a.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td></tr>`;
        }).join('');
        this._renderTable('agenda-tbody', data.length ? linhas : null);
    },
    renderEstoquePiercing(piercings) {
        const tbody = DomUtils.get('estoque-piercing-tbody');
        if (!tbody) return;
        tbody.innerHTML = piercings.length ? piercings.map(p => `<tr><td>${escapeHtml(p.nome)}</td><td>${p.quantidade}</td><td>${MoneyUtils.format(p.preco_venda)}</td><td>${MoneyUtils.format(p.custo_unitario || 0)}</td>
            <td class="actions-cell"><button class="btn-icon" data-acao="editar-piercing" data-id="${p.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn-icon" data-acao="excluir-piercing" data-id="${p.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('') : '<tr><td colspan="5">Nenhum piercing</td></tr>';
        const select = DomUtils.get('venda-piercing-id');
        if (select) select.innerHTML = '<option value="">Selecione</option>' + piercings.filter(p => p.quantidade > 0).map(p => `<option value="${p.id}" data-preco="${p.preco_venda}" data-custo="${p.custo_unitario || 0}">${escapeHtml(p.nome)} - Venda: ${MoneyUtils.format(p.preco_venda)} | Estoque: ${p.quantidade}</option>`).join('');
    },
    renderVendasPiercing(vendas) {
        const tbody = DomUtils.get('vendas-piercing-tbody');
        if (tbody) tbody.innerHTML = vendas.length ? vendas.map(v => `<tr><td>${DateUtils.formatDate(v.data)}</td><td>${escapeHtml(v.piercing?.nome || '?')}</td><td>${v.quantidade}</td><td>${MoneyUtils.format(v.valor_total)}</td><td>${escapeHtml(v.cliente || '-')}</td></tr>`).join('') : '<tr><td colspan="5">Nenhuma venda</td></tr>';
    },
    renderEstoqueMaterial(materiais) {
        const tbody = DomUtils.get('estoque-material-tbody');
        if (tbody) tbody.innerHTML = materiais.length ? materiais.map(m => `<tr><td>${escapeHtml(m.nome)}</td><td>${m.quantidade}</td><td>${MoneyUtils.format(m.valor_unitario)}</td>
            <td class="actions-cell"><button class="btn-icon" data-acao="editar-material" data-id="${m.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn-icon" data-acao="excluir-material" data-id="${m.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('') : '<tr><td colspan="4">Nenhum material</td></tr>';
        const select = DomUtils.get('uso-material-id');
        if (select) select.innerHTML = '<option value="">Selecione</option>' + materiais.filter(m => m.quantidade > 0).map(m => `<option value="${m.id}" data-custo="${m.valor_unitario}">${escapeHtml(m.nome)} (${m.quantidade} un.) - Custo un: ${MoneyUtils.format(m.valor_unitario)}</option>`).join('');
    },
    renderUsosMateriais(usos) {
        const tbody = DomUtils.get('usos-materiais-tbody');
        if (tbody) tbody.innerHTML = usos.length ? usos.map(u => `<tr><td>${DateUtils.formatDate(u.data)}</td><td>${escapeHtml(u.material?.nome || '?')}</td><td>${u.quantidade}</td><td>${escapeHtml(u.observacao || '-')}</td></tr>`).join('') : '<tr><td colspan="4">Nenhum uso</td></tr>';
    }
};

function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]); }

// ==================== DASHBOARD ====================
async function atualizarDashboard() {
    await DataService.loadAllServicos();
    await DataService.loadAllCaixa();
    const totalEntradas = AppState.caixa.reduce((s, i) => s + MoneyUtils.parse(i.entradas), 0);
    const totalSaidas = AppState.caixa.reduce((s, i) => s + MoneyUtils.parse(i.saidas), 0);
    const saldoAtual = AppState.caixa.length ? AppState.caixa[0].saldo_final : 0;
    const servicosRealizados = AppState.servicos.length;
    const repasseThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? MoneyUtils.parse(sv.valor_total) * 0.7 : 0), 0);
    DomUtils.setHtml('saldo-atual', MoneyUtils.format(saldoAtual));
    DomUtils.setHtml('total-entradas', MoneyUtils.format(totalEntradas));
    DomUtils.setHtml('total-saidas', MoneyUtils.format(totalSaidas));
    DomUtils.setHtml('servicos-realizados', servicosRealizados);
    DomUtils.setHtml('repasse-thalia', MoneyUtils.format(repasseThalia));
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
        if (!AppState.chartFaturamento) AppState.chartFaturamento = new Chart(ctx, { type: 'bar', data: { labels: meses, datasets: [{ label: 'Faturamento', data: valores, backgroundColor: '#818CF8' }] }, options: { responsive: true } });
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
async function carregarRelatorios() {
    await DataService.loadAllServicos();
    await DataService.loadAllCaixa();
    const faturamentoPorTatuador = {};
    AppState.servicos.forEach(s => { faturamentoPorTatuador[s.tatuador_nome] = (faturamentoPorTatuador[s.tatuador_nome] || 0) + MoneyUtils.parse(s.valor_total); });
    DomUtils.setHtml('faturamento-tatuador', Object.entries(faturamentoPorTatuador).map(([nome, valor]) => `<div><strong>${escapeHtml(nome)}:</strong> ${MoneyUtils.format(valor)}</div>`).join('') || 'Sem dados');
    const totalRepThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? MoneyUtils.parse(sv.valor_total) * 0.7 : 0), 0);
    DomUtils.setHtml('relatorio-repasse', `<strong>Total a repassar para Thalia:</strong> ${MoneyUtils.format(totalRepThalia)}`);
    const estudioThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? MoneyUtils.parse(sv.valor_total) * 0.3 : 0), 0);
    const totalSaidas = AppState.caixa.reduce((s, c) => s + MoneyUtils.parse(c.saidas), 0);
    DomUtils.setHtml('relatorio-lucro-liquido', `<strong>Lucro Líquido (Estúdio):</strong> ${MoneyUtils.format(estudioThalia - totalSaidas)}`);
}

// ==================== AUXILIARES CAIXA ====================
async function registrarEntradaCaixa(data, valor, descricao) {
    if (valor <= 0) return;
    try {
        const { data: ultimoCaixa } = await supabaseClient.from('caixa').select('saldo_final').order('data', { ascending: false }).limit(1);
        const ultimoSaldo = ultimoCaixa?.length ? ultimoCaixa[0].saldo_final : 0;
        await DataService.saveRecord('caixa', { data, saldo_inicial: ultimoSaldo, entradas: valor, saidas: 0, saldo_final: ultimoSaldo + valor, descricao });
        await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
        AlertUtils.show(`Entrada registrada: ${MoneyUtils.format(valor)}`, 'info');
    } catch (e) { console.warn(e); AlertUtils.show('Erro ao registrar entrada', 'warning'); }
}
async function registrarSaidaCaixa(data, valor, descricao) {
    if (valor <= 0) return;
    try {
        const { data: ultimoCaixa } = await supabaseClient.from('caixa').select('saldo_final').order('data', { ascending: false }).limit(1);
        const ultimoSaldo = ultimoCaixa?.length ? ultimoCaixa[0].saldo_final : 0;
        await DataService.saveRecord('caixa', { data, saldo_inicial: ultimoSaldo, entradas: 0, saidas: valor, saldo_final: ultimoSaldo - valor, descricao });
        await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
        AlertUtils.show(`Saída registrada: ${MoneyUtils.format(valor)}`, 'info');
    } catch (e) { console.warn(e); AlertUtils.show('Erro ao registrar saída', 'warning'); }
}

// ==================== MÓDULOS CRUD ====================
let pendingAgendaId = null;

const CaixaModule = {
    abrirModal: () => { DomUtils.clearForm('form-caixa'); DomUtils.setValue('caixa-data', DateUtils.nowDate()); DomUtils.setDisplay('modal-caixa', 'block'); },
    salvar: async () => {
        const id = DomUtils.getValue('caixa-id'), data = DomUtils.getValue('caixa-data');
        const saldoInicial = MoneyUtils.parse(DomUtils.getValue('caixa-saldo-inicial'));
        const entradas = MoneyUtils.parse(DomUtils.getValue('caixa-entradas'));
        const saidas = MoneyUtils.parse(DomUtils.getValue('caixa-saidas'));
        const descricao = DomUtils.getValue('caixa-descricao');
        const saldoFinal = saldoInicial + entradas - saidas;
        try {
            LoadingUtils.show('Salvando...');
            await DataService.saveRecord('caixa', { data, saldo_inicial: saldoInicial, entradas, saidas, saldo_final: saldoFinal, descricao }, id || null);
            DomUtils.setDisplay('modal-caixa', 'none');
            await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
            atualizarDashboard();
            AlertUtils.show(id ? 'Lançamento atualizado' : 'Lançamento salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar caixa', e); } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.caixa.find(c => c.id == id);
        if (item) {
            DomUtils.setValue('caixa-id', item.id); DomUtils.setValue('caixa-data', item.data);
            DomUtils.setValue('caixa-saldo-inicial', item.saldo_inicial); DomUtils.setValue('caixa-entradas', item.entradas);
            DomUtils.setValue('caixa-saidas', item.saidas); DomUtils.setValue('caixa-descricao', item.descricao || '');
            DomUtils.setDisplay('modal-caixa', 'block');
        }
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este lançamento?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('caixa', id);
            await DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || '');
            atualizarDashboard();
            AlertUtils.show('Lançamento excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir caixa', e); } finally { LoadingUtils.hide(); }
    },
    filtrar: () => DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || '')
};

const ServicosModule = {
    abrirModal: () => { DomUtils.clearForm('form-servico'); DomUtils.setValue('servico-data', DateUtils.nowDate()); DomUtils.setDisplay('modal-servico', 'block'); ServicosModule.calcularRepasse(); },
    calcularRepasse: () => {
        const valor = MoneyUtils.parse(DomUtils.getValue('servico-valor'));
        const tatuador = DomUtils.getValue('servico-tatuador');
        const estudio = tatuador === 'Thalia' ? valor * 0.3 : valor;
        const repasse = tatuador === 'Thalia' ? valor * 0.7 : 0;
        DomUtils.setHtml('valor-estudio', MoneyUtils.format(estudio));
        DomUtils.setHtml('valor-repasse', MoneyUtils.format(repasse));
    },
    salvar: async () => {
        const id = DomUtils.getValue('servico-id');
        const record = {
            data: DomUtils.getValue('servico-data'), cliente: DomUtils.getValue('servico-cliente'),
            tatuador_nome: DomUtils.getValue('servico-tatuador'), tipo: DomUtils.getValue('servico-tipo'),
            descricao: DomUtils.getValue('servico-descricao'), valor_total: MoneyUtils.parse(DomUtils.getValue('servico-valor')),
            forma_pagamento: DomUtils.getValue('servico-pagamento')
        };
        try {
            LoadingUtils.show('Salvando serviço...');
            await DataService.saveRecord('servicos', record, id || null);
            DomUtils.setDisplay('modal-servico', 'none');
            await DataService.loadServicos(AppState.paginacao.servicos.pagina);
            await atualizarDashboard();
            if (pendingAgendaId) {
                await DataService.saveRecord('agenda', { status: 'Concluído' }, pendingAgendaId);
                await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
                AlertUtils.show('Agendamento concluído!', 'success');
                pendingAgendaId = null;
            }
            const { data: ultimoCaixa } = await supabaseClient.from('caixa').select('saldo_final').order('data', { ascending: false }).limit(1);
            const ultimoSaldo = ultimoCaixa?.length ? ultimoCaixa[0].saldo_final : 0;
            await DataService.saveRecord('caixa', { data: record.data, saldo_inicial: ultimoSaldo, entradas: record.valor_total, saidas: 0, saldo_final: ultimoSaldo + record.valor_total, descricao: `Serviço: ${record.cliente} - ${record.tipo} (${record.tatuador_nome})` });
            await DataService.loadCaixa(AppState.paginacao.caixa.pagina, 10, DomUtils.getValue('search-caixa') || '');
            AlertUtils.show(id ? 'Serviço atualizado' : 'Serviço salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar serviço', e); } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.servicos.find(s => s.id == id);
        if (item) {
            DomUtils.setValue('servico-id', item.id); DomUtils.setValue('servico-data', item.data);
            DomUtils.setValue('servico-cliente', item.cliente); DomUtils.setValue('servico-tatuador', item.tatuador_nome);
            DomUtils.setValue('servico-tipo', item.tipo); DomUtils.setValue('servico-descricao', item.descricao || '');
            DomUtils.setValue('servico-valor', item.valor_total); DomUtils.setValue('servico-pagamento', item.forma_pagamento);
            DomUtils.setDisplay('modal-servico', 'block'); ServicosModule.calcularRepasse();
        }
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este serviço?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('servicos', id);
            await DataService.loadServicos(AppState.paginacao.servicos.pagina);
            await atualizarDashboard();
            AlertUtils.show('Serviço excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir serviço', e); } finally { LoadingUtils.hide(); }
    },
    filtrar: () => DataService.loadServicos(1),
    limparFiltros: () => {
        DomUtils.setValue('filtro-tatuador-servico', ''); DomUtils.setValue('filtro-tipo-servico', '');
        DomUtils.setValue('filtro-pagamento', ''); DomUtils.setValue('filtro-data-servico', '');
        DomUtils.setValue('search-servicos', ''); DataService.loadServicos(1);
    }
};

const AgendaModule = {
    abrirModal: () => { DomUtils.clearForm('form-agenda'); DomUtils.setValue('agenda-data', DateUtils.nowDate()); DomUtils.setDisplay('modal-agenda', 'block'); },
    salvar: async () => {
        const id = DomUtils.getValue('agenda-id');
        const dataLocal = DomUtils.getValue('agenda-data'), horaLocal = DomUtils.getValue('agenda-horario');
        if (!dataLocal || !horaLocal) return AlertUtils.show('Data e horário obrigatórios', 'error');
        const dataHoraLocal = new Date(`${dataLocal}T${horaLocal}:00`);
        if (isNaN(dataHoraLocal.getTime())) return AlertUtils.show('Data/hora inválida', 'error');
        const record = {
            data_hora: dataHoraLocal.toISOString(), cliente: DomUtils.getValue('agenda-cliente'),
            tatuador_nome: DomUtils.getValue('agenda-tatuador'), tipo_servico: DomUtils.getValue('agenda-tipo'),
            valor_estimado: 0, forma_pagamento: null, status: DomUtils.getValue('agenda-status'),
            observacoes: DomUtils.getValue('agenda-obs')
        };
        try {
            LoadingUtils.show('Salvando...');
            await DataService.saveRecord('agenda', record, id || null);
            DomUtils.setDisplay('modal-agenda', 'none');
            await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
            atualizarDashboard();
            AlertUtils.show(id ? 'Agendamento atualizado' : 'Agendamento salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar agenda', e); } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.agenda.find(a => a.id == id);
        if (item) {
            const dt = new Date(item.data_hora);
            if (!isNaN(dt.getTime())) {
                DomUtils.setValue('agenda-id', item.id); DomUtils.setValue('agenda-data', dt.toISOString().split('T')[0]);
                DomUtils.setValue('agenda-horario', dt.toTimeString().slice(0,5)); DomUtils.setValue('agenda-cliente', item.cliente);
                DomUtils.setValue('agenda-tatuador', item.tatuador_nome); DomUtils.setValue('agenda-tipo', item.tipo_servico);
                DomUtils.setValue('agenda-status', item.status); DomUtils.setValue('agenda-obs', item.observacoes || '');
                DomUtils.setDisplay('modal-agenda', 'block');
            }
        }
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este agendamento?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('agenda', id);
            await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
            atualizarDashboard();
            AlertUtils.show('Agendamento excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir agenda', e); } finally { LoadingUtils.hide(); }
    },
    realizarServico: async (id) => {
        const item = AppState.agenda.find(a => a.id == id);
        if (item) {
            DomUtils.setValue('servico-data', new Date(item.data_hora).toISOString().split('T')[0]);
            DomUtils.setValue('servico-cliente', item.cliente); DomUtils.setValue('servico-tatuador', item.tatuador_nome);
            DomUtils.setValue('servico-tipo', item.tipo_servico); DomUtils.setValue('servico-descricao', item.observacoes || '');
            DomUtils.setValue('servico-valor', item.valor_estimado || 0); DomUtils.setValue('servico-pagamento', item.forma_pagamento || 'PIX');
            ServicosModule.calcularRepasse();
            pendingAgendaId = id;
            DomUtils.setDisplay('modal-servico', 'block');
        }
    },
    filtrar: () => DataService.loadAgenda(1),
    filtrarHoje: () => { DomUtils.setValue('filtro-data-agenda', DateUtils.nowDate()); DataService.loadAgenda(1); },
    limparFiltros: () => { DomUtils.setValue('filtro-tatuador-agenda', ''); DomUtils.setValue('filtro-status-agenda', ''); DomUtils.setValue('filtro-data-agenda', ''); DataService.loadAgenda(1); }
};

const PiercingModule = {
    abrirModal: (id = null) => {
        DomUtils.clearForm('form-piercing');
        if (id) {
            supabaseClient.from('piercings_estoque').select('*').eq('id', id).single().then(({ data }) => {
                if (data) { DomUtils.setValue('piercing-id', data.id); DomUtils.setValue('piercing-nome', data.nome); DomUtils.setValue('piercing-qtd', data.quantidade); DomUtils.setValue('piercing-preco', data.preco_venda); DomUtils.setValue('piercing-custo', data.custo_unitario || 0); DomUtils.setDisplay('modal-piercing', 'block'); }
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
            await DataService.loadPiercings(); await DataService.loadVendasPiercing();
            AlertUtils.show('Piercing salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar piercing', e); } finally { LoadingUtils.hide(); }
    },
    editar: (id) => PiercingModule.abrirModal(id),
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este piercing?')) return;
        try { await DataService.deleteRecord('piercings_estoque', id); await DataService.loadPiercings(); await DataService.loadVendasPiercing(); AlertUtils.show('Piercing excluído', 'success'); } catch (e) { ErrorHandler.handle('excluir piercing', e); }
    },
    registrarVenda: async () => {
        const piercingId = DomUtils.getValue('venda-piercing-id'), quantidade = parseInt(DomUtils.getValue('venda-qtd')) || 0, cliente = DomUtils.getValue('venda-cliente');
        if (!piercingId) return AlertUtils.show('Selecione um piercing', 'error');
        if (quantidade <= 0) return AlertUtils.show('Quantidade deve ser maior que zero', 'error');
        try {
            LoadingUtils.show('Registrando venda...');
            const { data: piercing } = await supabaseClient.from('piercings_estoque').select('*').eq('id', piercingId).single();
            if (!piercing || piercing.quantidade < quantidade) throw new Error('Estoque insuficiente');
            const valorTotal = quantidade * piercing.preco_venda, custoTotal = quantidade * (piercing.custo_unitario || 0);
            await supabaseClient.from('piercings_estoque').update({ quantidade: piercing.quantidade - quantidade }).eq('id', piercingId);
            await supabaseClient.from('vendas_piercing').insert([{ piercing_id: piercingId, quantidade, valor_total: valorTotal, cliente: cliente || null, data: new Date().toISOString() }]);
            if (valorTotal > 0) await registrarEntradaCaixa(DateUtils.nowDate(), valorTotal, `Venda: ${quantidade} un. de ${piercing.nome}${cliente ? ' - ' + cliente : ''}`);
            if (custoTotal > 0) await registrarSaidaCaixa(DateUtils.nowDate(), custoTotal, `Custo de venda: ${quantidade} un. de ${piercing.nome}`);
            await DataService.loadPiercings(); await DataService.loadVendasPiercing();
            DomUtils.setValue('venda-qtd', 1); DomUtils.setValue('venda-cliente', '');
            AlertUtils.show(`Venda registrada: ${MoneyUtils.format(valorTotal)} (custo: ${MoneyUtils.format(custoTotal)})`, 'success');
        } catch (e) { ErrorHandler.handle('venda piercing', e); } finally { LoadingUtils.hide(); }
    }
};

const MateriaisModule = {
    abrirModal: (id = null) => {
        DomUtils.clearForm('form-material');
        if (id) {
            supabaseClient.from('materiais_estoque').select('*').eq('id', id).single().then(({ data }) => {
                if (data) { DomUtils.setValue('material-id', data.id); DomUtils.setValue('material-nome', data.nome); DomUtils.setValue('material-qtd', data.quantidade); DomUtils.setValue('material-preco', data.valor_unitario); DomUtils.setDisplay('modal-material', 'block'); }
            }).catch(e => ErrorHandler.handle('carregar material', e));
        } else DomUtils.setDisplay('modal-material', 'block');
    },
    salvar: async () => {
        const id = DomUtils.getValue('material-id'), nome = DomUtils.getValue('material-nome');
        const quantidade = parseInt(DomUtils.getValue('material-qtd')) || 0;
        const valor_unitario = MoneyUtils.parse(DomUtils.getValue('material-preco'));
        if (!nome) return AlertUtils.show('Nome obrigatório', 'error');
        try {
            LoadingUtils.show('Salvando...');
            let quantidadeAnterior = 0;
            if (id) { const { data } = await supabaseClient.from('materiais_estoque').select('quantidade').eq('id', id).single(); quantidadeAnterior = data?.quantidade || 0; }
            await DataService.saveRecord('materiais_estoque', { nome, quantidade, valor_unitario }, id || null);
            const dataHoje = DateUtils.nowDate();
            if (!id) { if (quantidade * valor_unitario > 0) await registrarSaidaCaixa(dataHoje, quantidade * valor_unitario, `Compra: ${quantidade} un. de ${nome}`); }
            else { const aumento = quantidade - quantidadeAnterior; if (aumento > 0 && aumento * valor_unitario > 0) await registrarSaidaCaixa(dataHoje, aumento * valor_unitario, `Adição ao estoque: +${aumento} un. de ${nome}`); }
            DomUtils.setDisplay('modal-material', 'none');
            await DataService.loadMateriais(); await DataService.loadUsosMateriais();
            AlertUtils.show('Material salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar material', e); } finally { LoadingUtils.hide(); }
    },
    editar: (id) => MateriaisModule.abrirModal(id),
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este material?')) return;
        try { await DataService.deleteRecord('materiais_estoque', id); await DataService.loadMateriais(); await DataService.loadUsosMateriais(); AlertUtils.show('Material excluído', 'success'); } catch (e) { ErrorHandler.handle('excluir material', e); }
    },
    registrarUso: async () => {
        const materialId = DomUtils.getValue('uso-material-id'), quantidade = parseInt(DomUtils.getValue('uso-qtd')) || 0, observacao = DomUtils.getValue('uso-obs');
        if (!materialId) return AlertUtils.show('Selecione um material', 'error');
        if (quantidade <= 0) return AlertUtils.show('Quantidade > zero', 'error');
        try {
            LoadingUtils.show('Registrando uso...');
            const { data: material } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
            if (!material || material.quantidade < quantidade) throw new Error('Quantidade insuficiente');
            const custoTotal = quantidade * material.valor_unitario;
            await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade - quantidade }).eq('id', materialId);
            await supabaseClient.from('usos_materiais').insert([{ material_id: materialId, quantidade, observacao: observacao || null, data: new Date().toISOString() }]);
            if (custoTotal > 0) await registrarSaidaCaixa(DateUtils.nowDate(), custoTotal, `Uso de material: ${quantidade} un. de ${material.nome} - ${observacao || ''}`);
            await DataService.loadMateriais(); await DataService.loadUsosMateriais();
            DomUtils.setValue('uso-qtd', 1); DomUtils.setValue('uso-obs', '');
            AlertUtils.show(`Uso registrado (custo: ${MoneyUtils.format(custoTotal)})`, 'success');
        } catch (e) { ErrorHandler.handle('uso material', e); } finally { LoadingUtils.hide(); }
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
        const file = input.files[0];
        if (!file) return;
        try {
            LoadingUtils.show('Importando...');
            const text = await file.text();
            const backup = JSON.parse(text);
            if (!backup.servicos) throw new Error('Arquivo inválido');
            if (!await ConfirmModal.show(`Importar backup de ${backup.data_exportacao}? Pode duplicar dados.`)) return;
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];
            for (const t of tabelas) {
                const registros = backup[t] || [];
                for (const reg of registros) { const { id, ...rest } = reg; await supabaseClient.from(t).insert([rest]); }
            }
            AlertUtils.show('Backup importado com sucesso', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (e) { ErrorHandler.handle('importar backup', e); } finally { LoadingUtils.hide(); }
        input.value = '';
    }
};

const ExemplosModule = {
    popularPiercings: async () => {
        if (!await ConfirmModal.show('Adicionar piercings de exemplo?')) return;
        const exemplos = [
            { nome: 'Piercing Nariz Cristal', quantidade: 10, preco_venda: 80.00, custo_unitario: 25.00 },
            { nome: 'Piercing Septo Aço', quantidade: 8, preco_venda: 120.00, custo_unitario: 35.00 },
            { nome: 'Piercing Lábio Argola', quantidade: 5, preco_venda: 70.00, custo_unitario: 20.00 }
        ];
        try {
            LoadingUtils.show('Adicionando...');
            for (const item of exemplos) {
                const { data: existente } = await supabaseClient.from('piercings_estoque').select('id').eq('nome', item.nome).maybeSingle();
                if (!existente) await supabaseClient.from('piercings_estoque').insert([item]);
            }
            await DataService.loadPiercings(); await DataService.loadVendasPiercing();
            AlertUtils.show('Exemplos adicionados!', 'success');
        } catch (e) { ErrorHandler.handle('exemplos piercings', e); } finally { LoadingUtils.hide(); }
    },
    popularMateriais: async () => {
        if (!await ConfirmModal.show('Adicionar materiais de exemplo?')) return;
        const exemplos = [
            { nome: 'Agulha 1207RL', quantidade: 50, valor_unitario: 2.50 },
            { nome: 'Tinta Preta Intenze', quantidade: 8, valor_unitario: 45.00 },
            { nome: 'Luvas Descartáveis M', quantidade: 100, valor_unitario: 0.80 }
        ];
        try {
            LoadingUtils.show('Adicionando...');
            for (const item of exemplos) {
                const { data: existente } = await supabaseClient.from('materiais_estoque').select('id').eq('nome', item.nome).maybeSingle();
                if (!existente) await supabaseClient.from('materiais_estoque').insert([item]);
            }
            await DataService.loadMateriais(); await DataService.loadUsosMateriais();
            AlertUtils.show('Exemplos adicionados!', 'success');
        } catch (e) { ErrorHandler.handle('exemplos materiais', e); } finally { LoadingUtils.hide(); }
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
    await DataService.loadCaixa(1, 10, '');
    await DataService.loadServicos(1, 10);
    await DataService.loadAgenda(1, 10);
    await DataService.loadPiercings();
    await DataService.loadVendasPiercing();
    await DataService.loadMateriais();
    await DataService.loadUsosMateriais();
    await atualizarDashboard();
    await carregarRelatorios();
}

async function carregarDadosSecao(sectionId) {
    const map = {
        dashboard: async () => { await DataService.loadAllServicos(); await DataService.loadAllCaixa(); await DataService.loadAgenda(1,10); atualizarDashboard(); },
        caixa: () => DataService.loadCaixa(1, 10, DomUtils.getValue('search-caixa') || ''),
        servicos: () => DataService.loadServicos(1, 10),
        agenda: () => DataService.loadAgenda(1, 10),
        relatorios: () => carregarRelatorios(),
        piercing: async () => { await DataService.loadPiercings(); await DataService.loadVendasPiercing(); },
        materiais: async () => { await DataService.loadMateriais(); await DataService.loadUsosMateriais(); }
    };
    if (map[sectionId]) await map[sectionId]();
}

function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const target = DomUtils.get(sectionId);
            if (target) target.classList.add('active');
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarDadosSecao(sectionId);
        });
    });
    // Modais: fechar com X
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', () => { const modalId = close.getAttribute('data-modal'); if (modalId) DomUtils.setDisplay(modalId, 'none'); });
    });
    // Botões CRUD
    DomUtils.get('btn-novo-caixa')?.addEventListener('click', () => CaixaModule.abrirModal());
    DomUtils.get('btn-salvar-caixa')?.addEventListener('click', () => CaixaModule.salvar());
    DomUtils.get('search-caixa')?.addEventListener('input', () => CaixaModule.filtrar());
    
    DomUtils.get('btn-novo-servico')?.addEventListener('click', () => ServicosModule.abrirModal());
    DomUtils.get('btn-salvar-servico')?.addEventListener('click', () => ServicosModule.salvar());
    DomUtils.get('limpar-filtros-servicos')?.addEventListener('click', () => ServicosModule.limparFiltros());
    DomUtils.get('search-servicos')?.addEventListener('input', () => ServicosModule.filtrar());
    ['filtro-tatuador-servico', 'filtro-tipo-servico', 'filtro-pagamento', 'filtro-data-servico'].forEach(id => {
        DomUtils.get(id)?.addEventListener('change', () => ServicosModule.filtrar());
    });
    DomUtils.get('servico-tatuador')?.addEventListener('change', () => ServicosModule.calcularRepasse());
    DomUtils.get('servico-valor')?.addEventListener('input', () => ServicosModule.calcularRepasse());
    
    DomUtils.get('btn-novo-agendamento')?.addEventListener('click', () => AgendaModule.abrirModal());
    DomUtils.get('btn-salvar-agenda')?.addEventListener('click', () => AgendaModule.salvar());
    DomUtils.get('filtrar-agenda-hoje')?.addEventListener('click', () => AgendaModule.filtrarHoje());
    DomUtils.get('limpar-filtros-agenda')?.addEventListener('click', () => AgendaModule.limparFiltros());
    ['filtro-tatuador-agenda', 'filtro-status-agenda', 'filtro-data-agenda'].forEach(id => {
        DomUtils.get(id)?.addEventListener('change', () => AgendaModule.filtrar());
    });
    
    DomUtils.get('btn-add-piercing')?.addEventListener('click', () => PiercingModule.abrirModal());
    DomUtils.get('btn-salvar-piercing')?.addEventListener('click', () => PiercingModule.salvar());
    DomUtils.get('btn-registrar-venda')?.addEventListener('click', () => PiercingModule.registrarVenda());
    DomUtils.get('btn-popular-piercings')?.addEventListener('click', () => ExemplosModule.popularPiercings());
    
    DomUtils.get('btn-add-material')?.addEventListener('click', () => MateriaisModule.abrirModal());
    DomUtils.get('btn-salvar-material')?.addEventListener('click', () => MateriaisModule.salvar());
    DomUtils.get('btn-usar-material')?.addEventListener('click', () => MateriaisModule.registrarUso());
    DomUtils.get('btn-popular-materiais')?.addEventListener('click', () => ExemplosModule.popularMateriais());
    
    DomUtils.get('btn-exportar-backup')?.addEventListener('click', () => BackupModule.exportar());
    DomUtils.get('btn-importar-backup')?.addEventListener('click', () => document.getElementById('import-backup')?.click());
    DomUtils.get('import-backup')?.addEventListener('change', (e) => BackupModule.importar(e.target));
    DomUtils.get('btn-sincronizar')?.addEventListener('click', () => location.reload());
    
    // Delegação de eventos para botões dinâmicos (editar/excluir)
    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const acao = btn.dataset.acao, id = btn.dataset.id;
        if (acao === 'editar-caixa') CaixaModule.editar(id);
        else if (acao === 'excluir-caixa') CaixaModule.excluir(id);
        else if (acao === 'editar-servico') ServicosModule.editar(id);
        else if (acao === 'excluir-servico') ServicosModule.excluir(id);
        else if (acao === 'realizar-servico') AgendaModule.realizarServico(id);
        else if (acao === 'editar-agenda') AgendaModule.editar(id);
        else if (acao === 'excluir-agenda') AgendaModule.excluir(id);
        else if (acao === 'editar-piercing') PiercingModule.editar(id);
        else if (acao === 'excluir-piercing') PiercingModule.excluir(id);
        else if (acao === 'editar-material') MateriaisModule.editar(id);
        else if (acao === 'excluir-material') MateriaisModule.excluir(id);
    });
}

async function inicializarApp() {
    const conectado = await testarConexao();
    if (conectado) {
        await carregarDadosPrincipais();
        setupEventListeners();
    }
}

document.addEventListener('DOMContentLoaded', inicializarApp);