// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou.');
}

// ==================== UTILITÁRIOS GLOBAIS ====================
const DomUtils = {
    get: (id) => document.getElementById(id),
    setHtml: (id, html) => { const el = DomUtils.get(id); if (el) el.innerHTML = html; },
    setValue: (id, value) => { const el = DomUtils.get(id); if (el) el.value = value; },
    getValue: (id) => DomUtils.get(id)?.value,
    setDisplay: (id, display) => { const el = DomUtils.get(id); if (el) el.style.display = display; },
    clearForm: (formId) => { const form = DomUtils.get(formId); if (form) form.reset(); },
    exists: (id) => !!DomUtils.get(id),
    createEl: (tag, props = {}, children = []) => {
        const el = document.createElement(tag);
        Object.entries(props).forEach(([k, v]) => el[k] = v);
        children.forEach(child => el.appendChild(child));
        return el;
    }
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
    toTimeString: (date) => date ? new Date(date).toTimeString().slice(0, 5) : '',
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
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
            overlay.innerHTML = '<div style="background:#fff; padding:20px; border-radius:8px;"><i class="fas fa-spinner fa-pulse"></i> <span id="loading-message">Carregando...</span></div>';
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

const ValidationUtils = {
    required: (value, fieldName) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
            throw new Error(`${fieldName} é obrigatório`);
        }
        return true;
    },
    positiveNumber: (value, fieldName) => {
        const num = MoneyUtils.parse(value);
        if (num < 0) throw new Error(`${fieldName} deve ser maior ou igual a zero`);
        return num;
    }
};

// ==================== MODAL DE CONFIRMAÇÃO ====================
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
        window.addEventListener('click', (e) => {
            if (e.target === modal) ConfirmModal._handle(false);
        });
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
        try {
            const data = await this.fetchAll('servicos', 'data', false);
            AppState.servicos = data;
        } catch (e) { ErrorHandler.handle('carregar todos serviços', e); }
    },

    async loadAllCaixa() {
        try {
            const data = await this.fetchAll('caixa', 'data', false);
            AppState.caixa = data;
        } catch (e) { ErrorHandler.handle('carregar todo caixa', e); }
    },

    async loadCaixa(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const { data, count } = await this.fetchTable('caixa', 'data', false, itensPorPagina, offset);
            AppState.caixa = data;
            AppState.paginacao.caixa.total = count;
            AppState.paginacao.caixa.pagina = pagina;
            Renderer.renderCaixa(AppState.caixa);
            Renderer.renderPaginacao('caixa', count, pagina, itensPorPagina, (novaPagina) => DataService.loadCaixa(novaPagina));
        } catch (e) { ErrorHandler.handle('carregar caixa', e); }
    },

    async loadServicos(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const { data, count } = await this.fetchTable('servicos', 'data', false, itensPorPagina, offset);
            AppState.servicos = data;
            AppState.paginacao.servicos.total = count;
            AppState.paginacao.servicos.pagina = pagina;
            Renderer.renderServicos(AppState.servicos);
            Renderer.renderPaginacao('servicos', count, pagina, itensPorPagina, (novaPagina) => DataService.loadServicos(novaPagina));
        } catch (e) { ErrorHandler.handle('carregar serviços', e); }
    },

    async loadAgenda(pagina = 1, itensPorPagina = 10) {
        try {
            const offset = (pagina - 1) * itensPorPagina;
            const { data, count } = await this.fetchTable('agenda', 'data_hora', true, itensPorPagina, offset);
            AppState.agenda = data;
            AppState.paginacao.agenda.total = count;
            AppState.paginacao.agenda.pagina = pagina;
            Renderer.renderAgenda(AppState.agenda);
            Renderer.renderPaginacao('agenda', count, pagina, itensPorPagina, (novaPagina) => DataService.loadAgenda(novaPagina));
        } catch (e) { ErrorHandler.handle('carregar agenda', e); }
    },

    async loadPiercings() {
        try {
            const { data } = await this.fetchTable('piercings_estoque', 'nome');
            Renderer.renderEstoquePiercing(data);
        } catch (e) { ErrorHandler.handle('carregar piercings', e); }
    },

    async loadVendasPiercing() {
        try {
            const { data, error } = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data', { ascending: false }).limit(100);
            if (error) throw error;
            Renderer.renderVendasPiercing(data || []);
        } catch (e) { ErrorHandler.handle('carregar vendas piercing', e); }
    },

    async loadMateriais() {
        try {
            const { data } = await this.fetchTable('materiais_estoque', 'nome');
            Renderer.renderEstoqueMaterial(data);
        } catch (e) { ErrorHandler.handle('carregar materiais', e); }
    },

    async loadUsosMateriais() {
        try {
            const { data, error } = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data', { ascending: false }).limit(100);
            if (error) throw error;
            Renderer.renderUsosMateriais(data || []);
        } catch (e) { ErrorHandler.handle('carregar usos materiais', e); }
    }
};

// ==================== RENDERIZAÇÃO ====================
const Renderer = {
    _renderTable: (idTbody, linhasHtml) => {
        const tbody = DomUtils.get(idTbody);
        if (!tbody) return;
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = linhasHtml;
        while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    },

    renderPaginacao: (prefixo, total, paginaAtual, itensPorPagina, callback) => {
        const container = DomUtils.get(`${prefixo}-paginacao`);
        if (!container) return;
        const totalPaginas = Math.ceil(total / itensPorPagina);
        if (totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }
        let html = `<div class="paginacao">`;
        html += `<button ${paginaAtual === 1 ? 'disabled' : ''} data-pagina="${paginaAtual - 1}">&laquo; Anterior</button>`;
        for (let i = 1; i <= totalPaginas; i++) {
            html += `<button class="${i === paginaAtual ? 'active' : ''}" data-pagina="${i}">${i}</button>`;
        }
        html += `<button ${paginaAtual === totalPaginas ? 'disabled' : ''} data-pagina="${paginaAtual + 1}">Próximo &raquo;</button>`;
        html += `</div>`;
        container.innerHTML = html;
        container.querySelectorAll('button[data-pagina]').forEach(btn => {
            btn.addEventListener('click', () => {
                const novaPagina = parseInt(btn.dataset.pagina);
                if (!isNaN(novaPagina)) callback(novaPagina);
            });
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
                <td>${DateUtils.formatDate(s.data)}</td>
                <td>${escapeHtml(s.cliente)}</td>
                <td>${escapeHtml(s.tatuador_nome)}</td>
                <td>${escapeHtml(s.tipo)}</td>
                <td>${escapeHtml(s.descricao) || '-'}</td>
                <td>${MoneyUtils.format(val)}</td>
                <td>${MoneyUtils.format(estudio)}</td>
                <td style="color:#34D399">${MoneyUtils.format(repasse)}</td>
                <td>${escapeHtml(s.forma_pagamento)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" data-acao="editar-servico" data-id="${s.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-acao="excluir-servico" data-id="${s.id}">Excluir</button>
                </td>
            </tr>`;
        }).join('');
        this._renderTable('servicos-tbody', data.length ? linhas : '<tr><td colspan="10">Nenhum serviço</td></tr>');
        DomUtils.setHtml('servicos-total-valor', MoneyUtils.format(totalValor));
        DomUtils.setHtml('servicos-total-estudio', MoneyUtils.format(totalEstudio));
        DomUtils.setHtml('servicos-total-repasse', MoneyUtils.format(totalRepasse));
    },

    renderAgenda(data) {
        const linhas = data.map(a => {
            const statusClass = {
                Agendado: 'status-warning',
                Confirmado: 'status-info',
                Concluído: 'status-success',
                Cancelado: 'status-danger'
            }[a.status] || '';
            const realizarBtn = a.status !== 'Concluído' && a.status !== 'Cancelado'
                ? `<button class="btn btn-success btn-sm" data-acao="realizar-servico" data-id="${a.id}"><i class="fas fa-check"></i> Realizar</button>`
                : '';
            const dt = new Date(a.data_hora);
            const dataStr = !isNaN(dt.getTime()) ? dt.toLocaleDateString('pt-BR') : '-';
            const horaStr = !isNaN(dt.getTime()) ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
            return `<tr>
                <td>${dataStr}</td>
                <td>${horaStr}</td>
                <td>${escapeHtml(a.cliente)}</td>
                <td>${escapeHtml(a.tatuador_nome)}</td>
                <td>${escapeHtml(a.tipo_servico)}</td>
                <td><span class="status-badge-item ${statusClass}">${escapeHtml(a.status)}</span></td>
                <td>${escapeHtml(a.observacoes) || '-'}</td>
                <td class="acoes-agenda">
                    ${realizarBtn}
                    <button class="btn btn-warning btn-sm" data-acao="editar-agenda" data-id="${a.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-acao="excluir-agenda" data-id="${a.id}">Excluir</button>
                </td>
            </tr>`;
        }).join('');
        const tbody = DomUtils.get('agenda-tbody');
        if (tbody) {
            tbody.innerHTML = data.length ? linhas : '<tr><td colspan="8">Nenhum agendamento</td></tr>';
        }
    },

    renderEstoquePiercing(piercings) {
        const tbody = DomUtils.get('estoque-piercing-tbody');
        if (!tbody) return;
        const fragment = document.createDocumentFragment();
        piercings.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(p.nome)}</td>
                <td>${p.quantidade}</td>
                <td>${MoneyUtils.format(p.preco_venda)}</td>
                <td>${MoneyUtils.format(p.custo_unitario || 0)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" data-acao="editar-piercing" data-id="${p.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-acao="excluir-piercing" data-id="${p.id}">Excluir</button>
                </td>
            `;
            fragment.appendChild(tr);
        });
        tbody.innerHTML = '';
        if (piercings.length) tbody.appendChild(fragment);
        else tbody.innerHTML = '<tr><td colspan="5">Nenhum piercing</td></tr>';

        const select = DomUtils.get('venda-piercing-id');
        if (select) {
            select.innerHTML = '<option value="">Selecione</option>' +
                piercings.filter(p => p.quantidade > 0)
                    .map(p => `<option value="${p.id}" data-preco="${p.preco_venda}" data-custo="${p.custo_unitario || 0}">${escapeHtml(p.nome)} - Venda: ${MoneyUtils.format(p.preco_venda)} | Custo: ${MoneyUtils.format(p.custo_unitario || 0)} (Estoque: ${p.quantidade})</option>`)
                    .join('');
        }
    },

    renderVendasPiercing(vendas) {
        const tbody = DomUtils.get('vendas-piercing-tbody');
        if (!tbody) return;
        tbody.innerHTML = vendas.length ? vendas.map(v => `<tr>
            <td>${DateUtils.formatDate(v.data)}</td>
            <td>${escapeHtml(v.piercing?.nome || '?')}</td>
            <td>${v.quantidade}</td>
            <td>${MoneyUtils.format(v.valor_total)}</td>
            <td>${escapeHtml(v.cliente || '-')}</td>
        </tr>`).join('') : '<tr><td colspan="5">Nenhuma venda</td></tr>';
    },

    renderEstoqueMaterial(materiais) {
        const tbody = DomUtils.get('estoque-material-tbody');
        if (!tbody) return;
        tbody.innerHTML = materiais.length ? materiais.map(m => `<tr>
            <td>${escapeHtml(m.nome)}</td>
            <td>${m.quantidade}</td>
            <td>${MoneyUtils.format(m.valor_unitario)}</td>
            <td>
                <button class="btn btn-warning btn-sm" data-acao="editar-material" data-id="${m.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-acao="excluir-material" data-id="${m.id}">Excluir</button>
            </td>
        </tr>`).join('') : '<tr><td colspan="4">Nenhum material</td></tr>';
        const select = DomUtils.get('uso-material-id');
        if (select) {
            select.innerHTML = '<option value="">Selecione</option>' +
                materiais.filter(m => m.quantidade > 0)
                    .map(m => `<option value="${m.id}" data-custo="${m.valor_unitario}">${escapeHtml(m.nome)} (${m.quantidade} un.) - Custo un: ${MoneyUtils.format(m.valor_unitario)}</option>`)
                    .join('');
        }
    },

    renderUsosMateriais(usos) {
        const tbody = DomUtils.get('usos-materiais-tbody');
        if (!tbody) return;
        tbody.innerHTML = usos.length ? usos.map(u => `<tr>
            <td>${DateUtils.formatDate(u.data)}</td>
            <td>${escapeHtml(u.material?.nome || '?')}</td>
            <td>${u.quantidade}</td>
            <td>${escapeHtml(u.observacao || '-')}</td>
        </tr>`).join('') : '<tr><td colspan="4">Nenhum uso</td></tr>';
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

// ==================== DASHBOARD E RELATÓRIOS ====================
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
    DomUtils.setHtml('servicos-recentes', recentes.length
        ? `<ul>${recentes.map(s => `<li>${DateUtils.formatDate(s.data)} - ${escapeHtml(s.cliente)}: ${MoneyUtils.format(s.valor_total)}</li>`).join('')}</ul>`
        : 'Nenhum');

    const proximos = AppState.agenda.filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'Cancelado').slice(0, 5);
    DomUtils.setHtml('proximos-agendamentos', proximos.length
        ? `<ul>${proximos.map(a => `<li>${DateUtils.formatDateTime(a.data_hora)} - ${escapeHtml(a.cliente)}</li>`).join('')}</ul>`
        : 'Nenhum');

    const canvasFaturamento = DomUtils.get('chart-faturamento');
    if (canvasFaturamento) {
        const ctx = canvasFaturamento.getContext('2d');
        const meses = [], valores = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            meses.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
            const soma = AppState.servicos.filter(s => {
                const [ano, mes] = s.data.split('-');
                return parseInt(mes) - 1 === d.getMonth() && parseInt(ano) === d.getFullYear();
            }).reduce((acc, sv) => acc + MoneyUtils.parse(sv.valor_total), 0);
            valores.push(soma);
        }
        if (!AppState.chartFaturamento) {
            AppState.chartFaturamento = new Chart(ctx, {
                type: 'bar',
                data: { labels: meses, datasets: [{ label: 'Faturamento', data: valores, backgroundColor: '#818CF8' }] },
                options: { responsive: true }
            });
        } else {
            AppState.chartFaturamento.data.labels = meses;
            AppState.chartFaturamento.data.datasets[0].data = valores;
            AppState.chartFaturamento.update();
        }
    }

    const canvasTipos = DomUtils.get('chart-tipos');
    if (canvasTipos) {
        const ctx = canvasTipos.getContext('2d');
        const tatuagens = AppState.servicos.filter(s => s.tipo === 'Tatuagem').length;
        const piercingsServ = AppState.servicos.filter(s => s.tipo === 'Piercing').length;
        if (!AppState.chartTipos) {
            AppState.chartTipos = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['Tatuagens', 'Piercings'], datasets: [{ data: [tatuagens, piercingsServ], backgroundColor: ['#818CF8', '#C084FC'] }] }
            });
        } else {
            AppState.chartTipos.data.datasets[0].data = [tatuagens, piercingsServ];
            AppState.chartTipos.update();
        }
    }
}

async function carregarRelatorios() {
    await DataService.loadAllServicos();
    await DataService.loadAllCaixa();

    const faturamentoPorTatuador = {};
    AppState.servicos.forEach(s => {
        faturamentoPorTatuador[s.tatuador_nome] = (faturamentoPorTatuador[s.tatuador_nome] || 0) + MoneyUtils.parse(s.valor_total);
    });
    DomUtils.setHtml('faturamento-tatuador',
        Object.entries(faturamentoPorTatuador).map(([nome, valor]) => `<div><strong>${escapeHtml(nome)}:</strong> ${MoneyUtils.format(valor)}</div>`).join('') || 'Sem dados'
    );

    const totalRepThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? MoneyUtils.parse(sv.valor_total) * 0.7 : 0), 0);
    DomUtils.setHtml('relatorio-repasse', `<strong>Total a repassar para Thalia:</strong> ${MoneyUtils.format(totalRepThalia)}`);

    const estudioThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? MoneyUtils.parse(sv.valor_total) * 0.3 : 0), 0);
    const totalSaidas = AppState.caixa.reduce((s, c) => s + MoneyUtils.parse(c.saidas), 0);
    const lucroLiquido = estudioThalia - totalSaidas;
    DomUtils.setHtml('relatorio-lucro-liquido', `<strong>Lucro Líquido (Estúdio):</strong> ${MoneyUtils.format(lucroLiquido)}`);
}

// ==================== FUNÇÕES AUXILIARES PARA CAIXA ====================
async function registrarEntradaCaixa(data, valor, descricao) {
    if (valor <= 0) return;
    try {
        const { data: ultimoCaixa } = await supabaseClient
            .from('caixa')
            .select('saldo_final')
            .order('data', { ascending: false })
            .limit(1);
        const ultimoSaldo = ultimoCaixa && ultimoCaixa.length ? ultimoCaixa[0].saldo_final : 0;
        const entrada = {
            data: data,
            saldo_inicial: ultimoSaldo,
            entradas: valor,
            saidas: 0,
            saldo_final: ultimoSaldo + valor,
            descricao: descricao
        };
        await DataService.saveRecord('caixa', entrada);
        await DataService.loadCaixa(AppState.paginacao.caixa.pagina);
        AlertUtils.show(`Entrada registrada no caixa: ${MoneyUtils.format(valor)}`, 'info');
    } catch (e) {
        console.warn('Erro ao registrar entrada no caixa:', e);
        AlertUtils.show('Erro ao registrar entrada no caixa. Registre manualmente.', 'warning');
    }
}

async function registrarSaidaCaixa(data, valor, descricao) {
    if (valor <= 0) return;
    try {
        const { data: ultimoCaixa } = await supabaseClient
            .from('caixa')
            .select('saldo_final')
            .order('data', { ascending: false })
            .limit(1);
        const ultimoSaldo = ultimoCaixa && ultimoCaixa.length ? ultimoCaixa[0].saldo_final : 0;
        const saida = {
            data: data,
            saldo_inicial: ultimoSaldo,
            entradas: 0,
            saidas: valor,
            saldo_final: ultimoSaldo - valor,
            descricao: descricao
        };
        await DataService.saveRecord('caixa', saida);
        await DataService.loadCaixa(AppState.paginacao.caixa.pagina);
        AlertUtils.show(`Saída registrada no caixa: ${MoneyUtils.format(valor)}`, 'info');
    } catch (e) {
        console.warn('Erro ao registrar saída no caixa:', e);
        AlertUtils.show('Erro ao registrar saída no caixa. Registre manualmente.', 'warning');
    }
}

// ==================== MÓDULOS CRUD ====================

// --- CAIXA ---
const CaixaModule = {
    abrirModal: () => {
        DomUtils.clearForm('form-caixa');
        DomUtils.setValue('caixa-data', DateUtils.nowDate());
        DomUtils.setDisplay('modal-caixa', 'block');
    },
    salvar: async () => {
        const id = DomUtils.getValue('caixa-id');
        const data = DomUtils.getValue('caixa-data');
        const saldoInicial = MoneyUtils.parse(DomUtils.getValue('caixa-saldo-inicial'));
        const entradas = MoneyUtils.parse(DomUtils.getValue('caixa-entradas'));
        const saidas = MoneyUtils.parse(DomUtils.getValue('caixa-saidas'));
        const descricao = DomUtils.getValue('caixa-descricao');
        const saldoFinal = saldoInicial + entradas - saidas;
        const record = { data, saldo_inicial: saldoInicial, entradas, saidas, saldo_final: saldoFinal, descricao };
        try {
            LoadingUtils.show('Salvando lançamento...');
            await DataService.saveRecord('caixa', record, id || null);
            DomUtils.setDisplay('modal-caixa', 'none');
            await DataService.loadCaixa(AppState.paginacao.caixa.pagina);
            atualizarDashboard();
            AlertUtils.show(id ? 'Lançamento atualizado' : 'Lançamento salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar caixa', e); }
        finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.caixa.find(c => c.id === id);
        if (!item) return;
        DomUtils.setValue('caixa-id', item.id);
        DomUtils.setValue('caixa-data', item.data);
        DomUtils.setValue('caixa-saldo-inicial', item.saldo_inicial);
        DomUtils.setValue('caixa-entradas', item.entradas);
        DomUtils.setValue('caixa-saidas', item.saidas);
        DomUtils.setValue('caixa-descricao', item.descricao || '');
        DomUtils.setDisplay('modal-caixa', 'block');
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este lançamento?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('caixa', id);
            await DataService.loadCaixa(AppState.paginacao.caixa.pagina);
            atualizarDashboard();
            AlertUtils.show('Lançamento excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir caixa', e); }
        finally { LoadingUtils.hide(); }
    },
    filtrar: () => {
        const termo = DomUtils.getValue('search-caixa')?.toLowerCase() || '';
        DataService.loadCaixa(1);
    }
};

// --- SERVIÇOS ---
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
        const estudio = tatuador === 'Thalia' ? valor * 0.3 : valor;
        const repasse = tatuador === 'Thalia' ? valor * 0.7 : 0;
        DomUtils.setHtml('valor-estudio', MoneyUtils.format(estudio));
        DomUtils.setHtml('valor-repasse', MoneyUtils.format(repasse));
    },
    salvar: async () => {
        const id = DomUtils.getValue('servico-id');
        const record = {
            data: DomUtils.getValue('servico-data'),
            cliente: DomUtils.getValue('servico-cliente'),
            tatuador_nome: DomUtils.getValue('servico-tatuador'),
            tipo: DomUtils.getValue('servico-tipo'),
            descricao: DomUtils.getValue('servico-descricao'),
            valor_total: MoneyUtils.parse(DomUtils.getValue('servico-valor')),
            forma_pagamento: DomUtils.getValue('servico-pagamento')
        };
        try {
            LoadingUtils.show('Salvando serviço...');
            await DataService.saveRecord('servicos', record, id || null);
            DomUtils.setDisplay('modal-servico', 'none');
            await DataService.loadServicos(AppState.paginacao.servicos.pagina);
            await atualizarDashboard();

            if (window.pendingAgendaId) {
                try {
                    await DataService.saveRecord('agenda', { status: 'Concluído' }, window.pendingAgendaId);
                    await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
                    AlertUtils.show('Agendamento marcado como Concluído!', 'success');
                } catch (e) {
                    AlertUtils.show('Serviço salvo, mas falha ao atualizar agendamento.', 'warning');
                    console.error('Falha ao concluir agendamento:', e);
                }
                delete window.pendingAgendaId;
            }

            // REMOVIDO: bloco que registrava automaticamente entrada no caixa

            AlertUtils.show(id ? 'Serviço atualizado' : 'Serviço salvo', 'success');
        } catch (e) {
            ErrorHandler.handle('salvar serviço', e);
        } finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.servicos.find(s => s.id === id);
        if (!item) return;
        DomUtils.setValue('servico-id', item.id);
        DomUtils.setValue('servico-data', item.data);
        DomUtils.setValue('servico-cliente', item.cliente);
        DomUtils.setValue('servico-tatuador', item.tatuador_nome);
        DomUtils.setValue('servico-tipo', item.tipo);
        DomUtils.setValue('servico-descricao', item.descricao || '');
        DomUtils.setValue('servico-valor', item.valor_total);
        DomUtils.setValue('servico-pagamento', item.forma_pagamento);
        DomUtils.setDisplay('modal-servico', 'block');
        ServicosModule.calcularRepasse();
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este serviço?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('servicos', id);
            await DataService.loadServicos(AppState.paginacao.servicos.pagina);
            await atualizarDashboard();
            AlertUtils.show('Serviço excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir serviço', e); }
        finally { LoadingUtils.hide(); }
    },
    filtrar: () => {
        DataService.loadServicos(1);
    },
    limparFiltros: () => {
        DomUtils.setValue('filtro-tatuador-servico', '');
        DomUtils.setValue('filtro-tipo-servico', '');
        DomUtils.setValue('filtro-pagamento', '');
        DomUtils.setValue('filtro-data-servico', '');
        DomUtils.setValue('search-servicos', '');
        DataService.loadServicos(1);
    }
};

// --- AGENDA ---
const AgendaModule = {
    abrirModal: () => {
        DomUtils.clearForm('form-agenda');
        DomUtils.setValue('agenda-data', DateUtils.nowDate());
        DomUtils.setDisplay('modal-agenda', 'block');
    },
    salvar: async () => {
        const id = DomUtils.getValue('agenda-id');
        const dataLocal = DomUtils.getValue('agenda-data');
        const horaLocal = DomUtils.getValue('agenda-horario');

        if (!dataLocal || !horaLocal) {
            AlertUtils.show('Data e horário são obrigatórios', 'error');
            return;
        }

        const dataHoraLocal = new Date(`${dataLocal}T${horaLocal}:00`);
        if (isNaN(dataHoraLocal.getTime())) {
            AlertUtils.show('Data/hora inválida', 'error');
            return;
        }
        const dataHoraUTC = dataHoraLocal.toISOString();

        const record = {
            data_hora: dataHoraUTC,
            cliente: DomUtils.getValue('agenda-cliente'),
            tatuador_nome: DomUtils.getValue('agenda-tatuador'),
            tipo_servico: DomUtils.getValue('agenda-tipo'),
            valor_estimado: 0,
            forma_pagamento: null,
            status: DomUtils.getValue('agenda-status'),
            observacoes: DomUtils.getValue('agenda-obs')
        };
        try {
            LoadingUtils.show('Salvando agendamento...');
            await DataService.saveRecord('agenda', record, id || null);
            DomUtils.setDisplay('modal-agenda', 'none');
            await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
            atualizarDashboard();
            AlertUtils.show(id ? 'Agendamento atualizado' : 'Agendamento salvo', 'success');
        } catch (e) { ErrorHandler.handle('salvar agenda', e); }
        finally { LoadingUtils.hide(); }
    },
    editar: async (id) => {
        const item = AppState.agenda.find(a => a.id === id);
        if (!item) return;
        const dt = new Date(item.data_hora);
        if (isNaN(dt.getTime())) return;

        const ano = dt.getFullYear();
        const mes = String(dt.getMonth() + 1).padStart(2, '0');
        const dia = String(dt.getDate()).padStart(2, '0');
        const horas = String(dt.getHours()).padStart(2, '0');
        const minutos = String(dt.getMinutes()).padStart(2, '0');

        DomUtils.setValue('agenda-id', item.id);
        DomUtils.setValue('agenda-data', `${ano}-${mes}-${dia}`);
        DomUtils.setValue('agenda-horario', `${horas}:${minutos}`);
        DomUtils.setValue('agenda-cliente', item.cliente);
        DomUtils.setValue('agenda-tatuador', item.tatuador_nome);
        DomUtils.setValue('agenda-tipo', item.tipo_servico);
        DomUtils.setValue('agenda-status', item.status);
        DomUtils.setValue('agenda-obs', item.observacoes || '');
        DomUtils.setDisplay('modal-agenda', 'block');
    },
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este agendamento?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('agenda', id);
            await DataService.loadAgenda(AppState.paginacao.agenda.pagina);
            atualizarDashboard();
            AlertUtils.show('Agendamento excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir agenda', e); }
        finally { LoadingUtils.hide(); }
    },
    realizarServico: async (id) => {
        const item = AppState.agenda.find(a => a.id === id);
        if (!item) return;
        const dt = new Date(item.data_hora);
        const dataLocal = dt.toISOString().split('T')[0];

        DomUtils.setValue('servico-data', dataLocal);
        DomUtils.setValue('servico-cliente', item.cliente);
        DomUtils.setValue('servico-tatuador', item.tatuador_nome);
        DomUtils.setValue('servico-tipo', item.tipo_servico);
        DomUtils.setValue('servico-descricao', item.observacoes || '');
        DomUtils.setValue('servico-valor', item.valor_estimado || 0);
        DomUtils.setValue('servico-pagamento', item.forma_pagamento || 'PIX');
        ServicosModule.calcularRepasse();
        window.pendingAgendaId = id;
        DomUtils.setDisplay('modal-servico', 'block');
    },
    filtrar: () => {
        DataService.loadAgenda(1);
    },
    filtrarHoje: () => {
        const dataInput = DomUtils.get('filtro-data-agenda');
        if (dataInput) dataInput.valueAsDate = new Date();
        DataService.loadAgenda(1);
    },
    limparFiltros: () => {
        DomUtils.setValue('filtro-tatuador-agenda', '');
        DomUtils.setValue('filtro-status-agenda', '');
        DomUtils.setValue('filtro-data-agenda', '');
        DataService.loadAgenda(1);
    }
};

// --- PIERCING ---
const PiercingModule = {
    abrirModal: (id = null) => {
        DomUtils.clearForm('form-piercing');
        if (id) {
            supabaseClient.from('piercings_estoque').select('*').eq('id', id).single()
                .then(({ data }) => {
                    if (data) {
                        DomUtils.setValue('piercing-id', data.id);
                        DomUtils.setValue('piercing-nome', data.nome);
                        DomUtils.setValue('piercing-qtd', data.quantidade);
                        DomUtils.setValue('piercing-preco', data.preco_venda);
                        DomUtils.setValue('piercing-custo', data.custo_unitario || 0);
                        DomUtils.setDisplay('modal-piercing', 'block');
                    }
                })
                .catch(e => ErrorHandler.handle('carregar piercing', e));
        } else {
            DomUtils.setDisplay('modal-piercing', 'block');
        }
    },
    salvar: async () => {
        const id = DomUtils.getValue('piercing-id');
        const nome = DomUtils.getValue('piercing-nome');
        const quantidade = parseInt(DomUtils.getValue('piercing-qtd')) || 0;
        const preco_venda = MoneyUtils.parse(DomUtils.getValue('piercing-preco'));
        const custo_unitario = MoneyUtils.parse(DomUtils.getValue('piercing-custo'));

        if (!nome) return AlertUtils.show('Nome obrigatório', 'error');

        if (!id && (!custo_unitario || custo_unitario <= 0)) {
            return AlertUtils.show('Para novo piercing, o Valor de Custo é obrigatório e deve ser maior que zero.', 'error');
        }

        try {
            LoadingUtils.show('Salvando piercing...');

            let quantidadeAnterior = 0;
            if (id) {
                const { data } = await supabaseClient
                    .from('piercings_estoque')
                    .select('quantidade')
                    .eq('id', id)
                    .single();
                quantidadeAnterior = data?.quantidade || 0;
            }

            await DataService.saveRecord(
                'piercings_estoque',
                { nome, quantidade, preco_venda, custo_unitario },
                id || null
            );

            const dataHoje = DateUtils.nowDate();

            if (!id) {
                const custoTotal = quantidade * custo_unitario;
                if (custoTotal > 0) {
                    await registrarSaidaCaixa(
                        dataHoje,
                        custoTotal,
                        `Compra de estoque: ${quantidade} un. de ${nome}`
                    );
                }
            } else {
                const aumento = quantidade - quantidadeAnterior;
                if (aumento > 0) {
                    const custoAdicional = aumento * custo_unitario;
                    if (custoAdicional > 0) {
                        await registrarSaidaCaixa(
                            dataHoje,
                            custoAdicional,
                            `Adição ao estoque: +${aumento} un. de ${nome}`
                        );
                    }
                }
            }

            DomUtils.setDisplay('modal-piercing', 'none');
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            AlertUtils.show('Piercing salvo', 'success');
        } catch (e) {
            ErrorHandler.handle('salvar piercing', e);
        } finally {
            LoadingUtils.hide();
        }
    },
    editar: (id) => PiercingModule.abrirModal(id),
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este piercing?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('piercings_estoque', id);
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            AlertUtils.show('Piercing excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir piercing', e); }
        finally { LoadingUtils.hide(); }
    },
    registrarVenda: async () => {
        const piercingId = DomUtils.getValue('venda-piercing-id');
        const quantidade = parseInt(DomUtils.getValue('venda-qtd')) || 0;
        const cliente = DomUtils.getValue('venda-cliente');

        if (!piercingId) return AlertUtils.show('Selecione um piercing', 'error');
        if (quantidade <= 0) return AlertUtils.show('Quantidade deve ser maior que zero', 'error');

        try {
            LoadingUtils.show('Registrando venda...');
            const { data: piercing, error } = await supabaseClient
                .from('piercings_estoque')
                .select('*')
                .eq('id', piercingId)
                .single();
            if (error) throw error;
            if (!piercing || piercing.quantidade < quantidade)
                throw new Error('Estoque insuficiente');

            const valorTotal = quantidade * piercing.preco_venda;
            const custoTotal = quantidade * (piercing.custo_unitario || 0);
            const dataHoje = DateUtils.nowDate();

            const { error: updateError } = await supabaseClient
                .from('piercings_estoque')
                .update({ quantidade: piercing.quantidade - quantidade })
                .eq('id', piercingId);
            if (updateError) throw updateError;

            const { error: insertError } = await supabaseClient
                .from('vendas_piercing')
                .insert([{
                    piercing_id: piercingId,
                    quantidade,
                    valor_total: valorTotal,
                    cliente: cliente || null,
                    data: new Date().toISOString()
                }]);
            if (insertError) {
                await supabaseClient
                    .from('piercings_estoque')
                    .update({ quantidade: piercing.quantidade })
                    .eq('id', piercingId);
                throw insertError;
            }

            if (valorTotal > 0) {
                await registrarEntradaCaixa(
                    dataHoje,
                    valorTotal,
                    `Venda: ${quantidade} un. de ${piercing.nome}${cliente ? ' - ' + cliente : ''}`
                );
            }

            if (custoTotal > 0) {
                await registrarSaidaCaixa(
                    dataHoje,
                    custoTotal,
                    `Custo de venda: ${quantidade} un. de ${piercing.nome}`
                );
            }

            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            DomUtils.setValue('venda-qtd', 1);
            DomUtils.setValue('venda-cliente', '');
            AlertUtils.show(
                `Venda registrada: ${MoneyUtils.format(valorTotal)} (custo: ${MoneyUtils.format(custoTotal)})`,
                'success'
            );
        } catch (e) {
            ErrorHandler.handle('venda piercing', e);
        } finally {
            LoadingUtils.hide();
        }
    }
};

// --- MATERIAIS ---
const MateriaisModule = {
    abrirModal: (id = null) => {
        DomUtils.clearForm('form-material');
        if (id) {
            supabaseClient.from('materiais_estoque').select('*').eq('id', id).single()
                .then(({ data }) => {
                    if (data) {
                        DomUtils.setValue('material-id', data.id);
                        DomUtils.setValue('material-nome', data.nome);
                        DomUtils.setValue('material-qtd', data.quantidade);
                        DomUtils.setValue('material-preco', data.valor_unitario);
                        DomUtils.setDisplay('modal-material', 'block');
                    }
                })
                .catch(e => ErrorHandler.handle('carregar material', e));
        } else {
            DomUtils.setDisplay('modal-material', 'block');
        }
    },
    salvar: async () => {
        const id = DomUtils.getValue('material-id');
        const nome = DomUtils.getValue('material-nome');
        const quantidade = parseInt(DomUtils.getValue('material-qtd')) || 0;
        const valor_unitario = MoneyUtils.parse(DomUtils.getValue('material-preco'));

        if (!nome) return AlertUtils.show('Nome obrigatório', 'error');

        try {
            LoadingUtils.show('Salvando material...');

            let quantidadeAnterior = 0;
            if (id) {
                const { data } = await supabaseClient
                    .from('materiais_estoque')
                    .select('quantidade')
                    .eq('id', id)
                    .single();
                quantidadeAnterior = data?.quantidade || 0;
            }

            await DataService.saveRecord(
                'materiais_estoque',
                { nome, quantidade, valor_unitario },
                id || null
            );

            const dataHoje = DateUtils.nowDate();

            if (!id) {
                const custoTotal = quantidade * valor_unitario;
                if (custoTotal > 0) {
                    await registrarSaidaCaixa(
                        dataHoje,
                        custoTotal,
                        `Compra de material: ${quantidade} un. de ${nome}`
                    );
                }
            } else {
                const aumento = quantidade - quantidadeAnterior;
                if (aumento > 0) {
                    const custoAdicional = aumento * valor_unitario;
                    if (custoAdicional > 0) {
                        await registrarSaidaCaixa(
                            dataHoje,
                            custoAdicional,
                            `Adição ao estoque de material: +${aumento} un. de ${nome}`
                        );
                    }
                }
            }

            DomUtils.setDisplay('modal-material', 'none');
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            AlertUtils.show('Material salvo', 'success');
        } catch (e) {
            ErrorHandler.handle('salvar material', e);
        } finally {
            LoadingUtils.hide();
        }
    },
    editar: (id) => MateriaisModule.abrirModal(id),
    excluir: async (id) => {
        if (!await ConfirmModal.show('Excluir este material?')) return;
        try {
            LoadingUtils.show('Excluindo...');
            await DataService.deleteRecord('materiais_estoque', id);
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            AlertUtils.show('Material excluído', 'success');
        } catch (e) { ErrorHandler.handle('excluir material', e); }
        finally { LoadingUtils.hide(); }
    },
    registrarUso: async () => {
        const materialId = DomUtils.getValue('uso-material-id');
        const quantidade = parseInt(DomUtils.getValue('uso-qtd')) || 0;
        const observacao = DomUtils.getValue('uso-obs');
        if (!materialId) return AlertUtils.show('Selecione um material', 'error');
        if (quantidade <= 0) return AlertUtils.show('Quantidade deve ser maior que zero', 'error');
        try {
            LoadingUtils.show('Registrando uso...');
            const { data: material, error } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
            if (error) throw error;
            if (!material || material.quantidade < quantidade) throw new Error('Quantidade insuficiente');
            
            const custoTotal = quantidade * material.valor_unitario;
            
            await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade - quantidade }).eq('id', materialId);
            const { error: insertError } = await supabaseClient.from('usos_materiais').insert([{ 
                material_id: materialId, quantidade, observacao: observacao || null,
                data: new Date().toISOString()
            }]);
            if (insertError) {
                await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade }).eq('id', materialId);
                throw insertError;
            }
            
            if (custoTotal > 0) {
                const dataHoje = DateUtils.nowDate();
                await registrarSaidaCaixa(dataHoje, custoTotal, `Uso de material: ${quantidade} un. de ${material.nome} - ${observacao || ''}`);
            }
            
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            DomUtils.setValue('uso-qtd', 1);
            DomUtils.setValue('uso-obs', '');
            AlertUtils.show(`Uso de ${quantidade} unidade(s) de ${material.nome} registrado (custo: ${MoneyUtils.format(custoTotal)})`, 'success');
        } catch (e) { ErrorHandler.handle('uso material', e); }
        finally { LoadingUtils.hide(); }
    }
};

// --- BACKUP ---
const BackupModule = {
    exportar: async () => {
        try {
            LoadingUtils.show('Gerando backup...');
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];
            const backup = { data_exportacao: new Date().toISOString() };
            for (const tabela of tabelas) {
                const { data } = await supabaseClient.from(tabela).select('*');
                backup[tabela] = data || [];
            }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `backup-dark013-${DateUtils.nowDate()}.json`;
            a.click();
            AlertUtils.show('Backup exportado', 'success');
        } catch (e) { ErrorHandler.handle('exportar backup', e); }
        finally { LoadingUtils.hide(); }
    },
    importar: async (input) => {
        const file = input.files[0];
        if (!file) return;
        try {
            LoadingUtils.show('Importando backup...');
            const text = await file.text();
            const backup = JSON.parse(text);
            if (!backup.servicos && !backup.agenda && !backup.caixa) throw new Error('Arquivo inválido');
            if (!await ConfirmModal.show(`Importar backup de ${backup.data_exportacao}? Isso pode duplicar dados.`)) return;
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];
            for (const tabela of tabelas) {
                const registros = backup[tabela] || [];
                for (const reg of registros) {
                    const { id, ...rest } = reg;
                    await supabaseClient.from(tabela).insert([rest]);
                }
            }
            AlertUtils.show('Backup importado com sucesso', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (e) { ErrorHandler.handle('importar backup', e); }
        finally { LoadingUtils.hide(); }
        input.value = '';
    }
};

// --- EXEMPLOS ---
const ExemplosModule = {
    popularPiercings: async () => {
        if (!await ConfirmModal.show('Isso irá adicionar piercings de exemplo (não remove os existentes). Continuar?')) return;
        const exemplos = [
            { nome: 'Piercing Nariz Cristal', quantidade: 10, preco_venda: 80.00, custo_unitario: 25.00 },
            { nome: 'Piercing Septo Aço', quantidade: 8, preco_venda: 120.00, custo_unitario: 35.00 },
            { nome: 'Piercing Lábio Argola', quantidade: 5, preco_venda: 70.00, custo_unitario: 20.00 },
            { nome: 'Piercing Tragus Pérola', quantidade: 12, preco_venda: 90.00, custo_unitario: 28.00 },
            { nome: 'Piercing Indústrial Barra', quantidade: 6, preco_venda: 110.00, custo_unitario: 32.00 }
        ];
        try {
            LoadingUtils.show('Adicionando exemplos...');
            for (const item of exemplos) {
                const { data: existente } = await supabaseClient.from('piercings_estoque').select('id').eq('nome', item.nome).maybeSingle();
                if (!existente) {
                    await supabaseClient.from('piercings_estoque').insert([item]);
                }
            }
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            AlertUtils.show('Piercings de exemplo adicionados!', 'success');
        } catch (e) { ErrorHandler.handle('exemplos piercings', e); }
        finally { LoadingUtils.hide(); }
    },
    popularMateriais: async () => {
        if (!await ConfirmModal.show('Isso irá adicionar materiais de exemplo (não remove os existentes). Continuar?')) return;
        const exemplos = [
            { nome: 'Agulha 1207RL', quantidade: 50, valor_unitario: 2.50 },
            { nome: 'Agulha 1005RL', quantidade: 40, valor_unitario: 2.50 },
            { nome: 'Tinta Preta Intenze', quantidade: 8, valor_unitario: 45.00 },
            { nome: 'Tinta Branca Eternal', quantidade: 5, valor_unitario: 55.00 },
            { nome: 'Luvas Descartáveis M', quantidade: 100, valor_unitario: 0.80 },
            { nome: 'Filme PVC', quantidade: 20, valor_unitario: 12.00 },
            { nome: 'Bálsamo Tattoo', quantidade: 15, valor_unitario: 18.00 }
        ];
        try {
            LoadingUtils.show('Adicionando exemplos...');
            for (const item of exemplos) {
                const { data: existente } = await supabaseClient.from('materiais_estoque').select('id').eq('nome', item.nome).maybeSingle();
                if (!existente) {
                    await supabaseClient.from('materiais_estoque').insert([item]);
                }
            }
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            AlertUtils.show('Materiais de exemplo adicionados!', 'success');
        } catch (e) { ErrorHandler.handle('exemplos materiais', e); }
        finally { LoadingUtils.hide(); }
    }
};

// ==================== NAVEGAÇÃO E INICIALIZAÇÃO ====================
async function testarConexao() {
    const statusEl = DomUtils.get('status-nuvem');
    if (!supabaseClient) {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Cliente Supabase não inicializado';
        return false;
    }
    try {
        const { error } = await supabaseClient.from('caixa').select('id').limit(1);
        if (error) throw error;
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Conectado ao Supabase';
            statusEl.className = 'status-badge status-connected';
        }
        return true;
    } catch (err) {
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Falha na conexão';
            statusEl.className = 'status-badge status-error';
        }
        ErrorHandler.handle('conexão', err);
        return false;
    }
}

async function carregarDadosPrincipais() {
    await DataService.loadCaixa(1, 100);
    await DataService.loadServicos(1, 100);
    await DataService.loadAgenda(1, 100);
    await DataService.loadPiercings();
    await DataService.loadVendasPiercing();
    await DataService.loadMateriais();
    await DataService.loadUsosMateriais();
    await atualizarDashboard();
    await carregarRelatorios();
}

async function carregarDadosSecao(sectionId) {
    const carregamentos = {
        dashboard: async () => {
            await DataService.loadAllServicos();
            await DataService.loadAllCaixa();
            await DataService.loadAgenda(1, 100);
            atualizarDashboard();
        },
        caixa: () => DataService.loadCaixa(1),
        servicos: () => DataService.loadServicos(1),
        agenda: () => DataService.loadAgenda(1),
        relatorios: () => carregarRelatorios(),
        piercing: async () => {
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
        },
        materiais: async () => {
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
        }
    };
    if (carregamentos[sectionId]) {
        await carregamentos[sectionId]();
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const targetSection = DomUtils.get(sectionId);
            if (targetSection) targetSection.classList.add('active');
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarDadosSecao(sectionId);
        });
    });
}

function setupGlobalDelegation() {
    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const acao = btn.dataset.acao;
        const id = btn.dataset.id;
        
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

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

async function inicializarApp() {
    const conectado = await testarConexao();
    if (conectado) {
        await carregarDadosPrincipais();
        setupNavigation();
        setupGlobalDelegation();
    }
}

// EXPOSIÇÃO GLOBAL
window.CaixaModule = CaixaModule;
window.ServicosModule = ServicosModule;
window.AgendaModule = AgendaModule;
window.PiercingModule = PiercingModule;
window.MateriaisModule = MateriaisModule;
window.BackupModule = BackupModule;
window.ExemplosModule = ExemplosModule;

window.abrirModalCaixa = () => CaixaModule.abrirModal();
window.salvarCaixa = () => CaixaModule.salvar();
window.filtrarCaixa = () => CaixaModule.filtrar();

window.abrirModalServico = () => ServicosModule.abrirModal();
window.salvarServico = () => ServicosModule.salvar();
window.filtrarServicos = () => ServicosModule.filtrar();
window.limparFiltrosServicos = () => ServicosModule.limparFiltros();
window.calcularRepasse = () => ServicosModule.calcularRepasse();

window.abrirModalAgendamento = () => AgendaModule.abrirModal();
window.salvarAgenda = () => AgendaModule.salvar();
window.filtrarAgenda = () => AgendaModule.filtrar();
window.filtrarAgendaHoje = () => AgendaModule.filtrarHoje();
window.limparFiltrosAgenda = () => AgendaModule.limparFiltros();

window.abrirModalPiercing = () => PiercingModule.abrirModal();
window.salvarPiercing = () => PiercingModule.salvar();
window.registrarVendaPiercing = () => PiercingModule.registrarVenda();
window.popularPiercingsExemplo = () => ExemplosModule.popularPiercings();

window.abrirModalMaterial = () => MateriaisModule.abrirModal();
window.salvarMaterial = () => MateriaisModule.salvar();
window.registrarUsoMaterial = () => MateriaisModule.registrarUso();
window.popularMateriaisExemplo = () => ExemplosModule.popularMateriais();

window.exportarBackup = () => BackupModule.exportar();
window.importarBackup = (input) => BackupModule.importar(input);
window.sincronizarAgora = () => location.reload();
window.fecharModal = (modalId) => DomUtils.setDisplay(modalId, 'none');

// Inicialização direta (sem autenticação)
document.addEventListener('DOMContentLoaded', inicializarApp);