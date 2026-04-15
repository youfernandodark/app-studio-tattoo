// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou.');
}

// ==================== ESTADO GLOBAL ====================
const AppState = {
    servicos: [],
    agenda: [],
    caixa: [],
    chartFaturamento: null,
    chartTipos: null
};

// ==================== HELPERS ====================
const Helpers = {
    formatMoney: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0),
    formatDate: (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-',
    formatDateTime: (date) => {
        if (!date) return '-';
        const dt = new Date(date);
        if (isNaN(dt.getTime())) return '-';
        return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    },
    showAlert: (message, type = 'info') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
        alertDiv.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        container.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 4500);
    },
    handleError: (context, error) => {
        console.error(`Erro em ${context}:`, error);
        Helpers.showAlert(`Erro em ${context}: ${error.message || error}`, 'error');
    },
    getElement: (id) => document.getElementById(id),
    setHTML: (id, html) => { const el = Helpers.getElement(id); if (el) el.innerHTML = html; },
    setValue: (id, value) => { const el = Helpers.getElement(id); if (el) el.value = value; },
    getValue: (id) => Helpers.getElement(id)?.value,
    setDisplay: (id, display) => { const el = Helpers.getElement(id); if (el) el.style.display = display; },
    closeModal: (modalId) => Helpers.setDisplay(modalId, 'none'),
    openModal: (modalId) => Helpers.setDisplay(modalId, 'block'),
    clearForm: (formId) => { const form = Helpers.getElement(formId); if (form) form.reset(); }
};

// ==================== SERVIÇO DE DADOS ====================
const DataService = {
    async fetchTable(table, orderBy = null, ascending = true) {
        let query = supabaseClient.from(table).select('*');
        if (orderBy) query = query.order(orderBy, { ascending });
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async loadCaixa() {
        try {
            AppState.caixa = await this.fetchTable('caixa', 'data', false);
            Renderer.renderCaixa(AppState.caixa);
        } catch (e) { Helpers.handleError('carregar caixa', e); }
    },

    async loadServicos() {
        try {
            AppState.servicos = await this.fetchTable('servicos', 'data', false);
            Renderer.renderServicos(AppState.servicos);
        } catch (e) { Helpers.handleError('carregar serviços', e); }
    },

    async loadAgenda() {
        try {
            AppState.agenda = await this.fetchTable('agenda', 'data_hora');
            Renderer.renderAgenda(AppState.agenda);
        } catch (e) { Helpers.handleError('carregar agenda', e); }
    },

    async loadPiercings() {
        try {
            const data = await this.fetchTable('piercings_estoque', 'nome');
            Renderer.renderEstoquePiercing(data);
        } catch (e) { Helpers.handleError('carregar piercings', e); }
    },

    async loadVendasPiercing() {
        try {
            const { data, error } = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data', { ascending: false });
            if (error) throw error;
            Renderer.renderVendasPiercing(data || []);
        } catch (e) { Helpers.handleError('carregar vendas piercing', e); }
    },

    async loadMateriais() {
        try {
            const data = await this.fetchTable('materiais_estoque', 'nome');
            Renderer.renderEstoqueMaterial(data);
        } catch (e) { Helpers.handleError('carregar materiais', e); }
    },

    async loadUsosMateriais() {
        try {
            const { data, error } = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data', { ascending: false });
            if (error) throw error;
            Renderer.renderUsosMateriais(data || []);
        } catch (e) { Helpers.handleError('carregar usos materiais', e); }
    },

    async saveRecord(table, record, id = null) {
        let error;
        if (id) {
            error = (await supabaseClient.from(table).update(record).eq('id', id)).error;
        } else {
            error = (await supabaseClient.from(table).insert([record])).error;
        }
        if (error) throw error;
    },

    async deleteRecord(table, id) {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;
    }
};

// ==================== RENDERIZAÇÃO ====================
const Renderer = {
    renderCaixa(data) {
        let totalEntradas = 0, totalSaidas = 0;
        const tbody = Helpers.getElement('caixa-tbody');
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="7">Nenhum lançamento</td></tr>';
        } else {
            tbody.innerHTML = data.map(item => {
                const ent = +item.entradas || 0;
                const sai = +item.saidas || 0;
                totalEntradas += ent;
                totalSaidas += sai;
                return `<tr>
                    <td>${Helpers.formatDate(item.data)}</td>
                    <td>${Helpers.formatMoney(item.saldo_inicial)}</td>
                    <td style="color:#34D399">+${Helpers.formatMoney(ent)}</td>
                    <td style="color:#F87171">-${Helpers.formatMoney(sai)}</td>
                    <td>${Helpers.formatMoney(item.saldo_final)}</td>
                    <td>${item.descricao || '-'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="CaixaModule.editar('${item.id}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="CaixaModule.excluir('${item.id}')">Excluir</button>
                    </td>
                </tr>`;
            }).join('');
        }
        Helpers.getElement('caixa-total-entradas').innerText = Helpers.formatMoney(totalEntradas);
        Helpers.getElement('caixa-total-saidas').innerText = Helpers.formatMoney(totalSaidas);
        const ultimoSaldo = data.length ? data[0].saldo_final : 0;
        Helpers.getElement('caixa-saldo-final').innerText = Helpers.formatMoney(ultimoSaldo);
    },

    renderServicos(data) {
        let totalValor = 0, totalEstudio = 0, totalRepasse = 0;
        const tbody = Helpers.getElement('servicos-tbody');
        tbody.innerHTML = data.map(s => {
            const val = +s.valor_total || 0;
            const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : 0;
            const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : val;
            totalValor += val;
            totalEstudio += estudio;
            totalRepasse += repasse;
            return `<tr>
                <td>${Helpers.formatDate(s.data)}</td>
                <td>${s.cliente}</td>
                <td>${s.tatuador_nome}</td>
                <td>${s.tipo}</td>
                <td>${s.descricao || '-'}</td>
                <td>${Helpers.formatMoney(val)}</td>
                <td>${Helpers.formatMoney(estudio)}</td>
                <td style="color:#34D399">${Helpers.formatMoney(repasse)}</td>
                <td>${s.forma_pagamento}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="ServicosModule.editar('${s.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="ServicosModule.excluir('${s.id}')">Excluir</button>
                </td>
            </tr>`;
        }).join('');
        Helpers.getElement('servicos-total-valor').innerText = Helpers.formatMoney(totalValor);
        Helpers.getElement('servicos-total-estudio').innerText = Helpers.formatMoney(totalEstudio);
        Helpers.getElement('servicos-total-repasse').innerText = Helpers.formatMoney(totalRepasse);
    },

    renderAgenda(data) {
        const tbody = Helpers.getElement('agenda-tbody');
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="9">Nenhum agendamento</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(a => {
            const statusClass = {
                Agendado: 'status-warning',
                Confirmado: 'status-info',
                Concluído: 'status-success',
                Cancelado: 'status-danger'
            }[a.status] || '';
            const realizarBtn = a.status !== 'Concluído' && a.status !== 'Cancelado'
                ? `<button class="btn btn-success btn-sm" onclick="AgendaModule.realizarServico('${a.id}')"><i class="fas fa-check"></i> Realizar Serviço</button> `
                : '';
            return `<tr>
                <td>${Helpers.formatDateTime(a.data_hora)}</td>
                <td>${a.cliente}</td>
                <td>${a.tatuador_nome}</td>
                <td>${a.tipo_servico}</td>
                <td>${Helpers.formatMoney(a.valor_estimado)}</td>
                <td>${a.forma_pagamento || '-'}</td>
                <td><span class="status-badge-item ${statusClass}">${a.status}</span></td>
                <td>${a.observacoes || '-'}</td>
                <td>
                    ${realizarBtn}
                    <button class="btn btn-warning btn-sm" onclick="AgendaModule.editar('${a.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="AgendaModule.excluir('${a.id}')">Excluir</button>
                </td>
            </tr>`;
        }).join('');
    },

    renderEstoquePiercing(piercings) {
        const tbody = Helpers.getElement('estoque-piercing-tbody');
        if (!piercings.length) {
            tbody.innerHTML = '<tr><td colspan="4">Nenhum piercing</td></tr>';
        } else {
            tbody.innerHTML = piercings.map(p => `<tr>
                <td>${p.nome}</td>
                <td>${p.quantidade}</td>
                <td>${Helpers.formatMoney(p.preco_venda)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="PiercingModule.editar(${p.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="PiercingModule.excluir(${p.id})">Excluir</button>
                </td>
            </tr>`).join('');
        }
        const select = Helpers.getElement('venda-piercing-id');
        if (select) {
            select.innerHTML = '<option value="">Selecione</option>' +
                piercings.filter(p => p.quantidade > 0)
                    .map(p => `<option value="${p.id}" data-preco="${p.preco_venda}">${p.nome} - ${Helpers.formatMoney(p.preco_venda)} (Estoque: ${p.quantidade})</option>`)
                    .join('');
        }
    },

    renderVendasPiercing(vendas) {
        const tbody = Helpers.getElement('vendas-piercing-tbody');
        if (!vendas.length) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhuma venda</td></tr>';
        } else {
            tbody.innerHTML = vendas.map(v => `<tr>
                <td>${Helpers.formatDate(v.data)}</td>
                <td>${v.piercing?.nome || '?'}</td>
                <td>${v.quantidade}</td>
                <td>${Helpers.formatMoney(v.valor_total)}</td>
                <td>${v.cliente || '-'}</td>
            </tr>`).join('');
        }
    },

    renderEstoqueMaterial(materiais) {
        const tbody = Helpers.getElement('estoque-material-tbody');
        if (!materiais.length) {
            tbody.innerHTML = '<tr><td colspan="4">Nenhum material</td></tr>';
        } else {
            tbody.innerHTML = materiais.map(m => `<tr>
                <td>${m.nome}</td>
                <td>${m.quantidade}</td>
                <td>${Helpers.formatMoney(m.valor_unitario)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="MateriaisModule.editar(${m.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="MateriaisModule.excluir(${m.id})">Excluir</button>
                </td>
            </tr>`).join('');
        }
        const select = Helpers.getElement('uso-material-id');
        if (select) {
            select.innerHTML = '<option value="">Selecione</option>' +
                materiais.filter(m => m.quantidade > 0)
                    .map(m => `<option value="${m.id}">${m.nome} (${m.quantidade} un.)</option>`)
                    .join('');
        }
    },

    renderUsosMateriais(usos) {
        const tbody = Helpers.getElement('usos-materiais-tbody');
        if (!usos.length) {
            tbody.innerHTML = '<tr><td colspan="4">Nenhum uso</td></tr>';
        } else {
            tbody.innerHTML = usos.map(u => `<tr>
                <td>${Helpers.formatDate(u.data)}</td>
                <td>${u.material?.nome || '?'}</td>
                <td>${u.quantidade}</td>
                <td>${u.observacao || '-'}</td>
            </tr>`).join('');
        }
    }
};

// ==================== DASHBOARD & RELATÓRIOS ====================
function atualizarDashboard() {
    const totalEntradas = AppState.caixa.reduce((s, i) => s + (+i.entradas || 0), 0);
    const totalSaidas = AppState.caixa.reduce((s, i) => s + (+i.saidas || 0), 0);
    const saldoAtual = AppState.caixa.length ? AppState.caixa[0].saldo_final : 0;
    const servicosRealizados = AppState.servicos.length;
    const repasseThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (+sv.valor_total || 0) * 0.7 : 0), 0);

    Helpers.getElement('saldo-atual').innerText = Helpers.formatMoney(saldoAtual);
    Helpers.getElement('total-entradas').innerText = Helpers.formatMoney(totalEntradas);
    Helpers.getElement('total-saidas').innerText = Helpers.formatMoney(totalSaidas);
    Helpers.getElement('servicos-realizados').innerText = servicosRealizados;
    Helpers.getElement('repasse-thalia').innerText = Helpers.formatMoney(repasseThalia);

    const recentes = AppState.servicos.slice(0, 5);
    Helpers.setHTML('servicos-recentes', recentes.length
        ? `<ul>${recentes.map(s => `<li>${Helpers.formatDate(s.data)} - ${s.cliente}: ${Helpers.formatMoney(s.valor_total)}</li>`).join('')}</ul>`
        : 'Nenhum');

    const proximos = AppState.agenda.filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'Cancelado').slice(0, 5);
    Helpers.setHTML('proximos-agendamentos', proximos.length
        ? `<ul>${proximos.map(a => `<li>${Helpers.formatDateTime(a.data_hora)} - ${a.cliente}</li>`).join('')}</ul>`
        : 'Nenhum');

    // Gráficos
    const canvasFaturamento = Helpers.getElement('chart-faturamento');
    if (canvasFaturamento) {
        if (AppState.chartFaturamento) AppState.chartFaturamento.destroy();
        const meses = [], valores = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            meses.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
            const soma = AppState.servicos.filter(s => {
                const data = new Date(s.data);
                return data.getMonth() === d.getMonth() && data.getFullYear() === d.getFullYear();
            }).reduce((acc, sv) => acc + (+sv.valor_total || 0), 0);
            valores.push(soma);
        }
        AppState.chartFaturamento = new Chart(canvasFaturamento.getContext('2d'), {
            type: 'bar',
            data: { labels: meses, datasets: [{ label: 'Faturamento', data: valores, backgroundColor: '#818CF8' }] }
        });
    }

    const canvasTipos = Helpers.getElement('chart-tipos');
    if (canvasTipos) {
        if (AppState.chartTipos) AppState.chartTipos.destroy();
        const tatuagens = AppState.servicos.filter(s => s.tipo === 'Tatuagem').length;
        const piercingsServ = AppState.servicos.filter(s => s.tipo === 'Piercing').length;
        AppState.chartTipos = new Chart(canvasTipos.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Tatuagens', 'Piercings'],
                datasets: [{ data: [tatuagens, piercingsServ], backgroundColor: ['#818CF8', '#C084FC'] }]
            }
        });
    }
}

async function carregarRelatorios() {
    await DataService.loadServicos();
    await DataService.loadCaixa();

    const faturamentoPorTatuador = {};
    AppState.servicos.forEach(s => {
        faturamentoPorTatuador[s.tatuador_nome] = (faturamentoPorTatuador[s.tatuador_nome] || 0) + (+s.valor_total || 0);
    });
    Helpers.setHTML('faturamento-tatuador',
        Object.entries(faturamentoPorTatuador).map(([nome, valor]) => `<div><strong>${nome}:</strong> ${Helpers.formatMoney(valor)}</div>`).join('') || 'Sem dados'
    );

    const totalRepThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (+sv.valor_total || 0) * 0.7 : 0), 0);
    Helpers.setHTML('relatorio-repasse', `<strong>Total a repassar para Thalia:</strong> ${Helpers.formatMoney(totalRepThalia)}`);

    const estudioThalia = AppState.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (+sv.valor_total || 0) * 0.3 : 0), 0);
    const totalSaidas = AppState.caixa.reduce((s, c) => s + (+c.saidas || 0), 0);
    const lucroLiquido = estudioThalia - totalSaidas;
    Helpers.setHTML('relatorio-lucro-liquido', `<strong>Lucro Líquido (Estúdio):</strong> ${Helpers.formatMoney(lucroLiquido)}`);
}

// ==================== MÓDULOS CRUD ====================

// --- CAIXA ---
const CaixaModule = {
    abrirModal: () => {
        Helpers.clearForm('form-caixa');
        Helpers.setValue('caixa-data', new Date().toISOString().split('T')[0]);
        Helpers.openModal('modal-caixa');
    },
    salvar: async () => {
        const id = Helpers.getValue('caixa-id');
        const data = Helpers.getValue('caixa-data');
        const saldoInicial = +Helpers.getValue('caixa-saldo-inicial') || 0;
        const entradas = +Helpers.getValue('caixa-entradas') || 0;
        const saidas = +Helpers.getValue('caixa-saidas') || 0;
        const descricao = Helpers.getValue('caixa-descricao');
        const saldoFinal = saldoInicial + entradas - saidas;
        const record = { data, saldo_inicial: saldoInicial, entradas, saidas, saldo_final: saldoFinal, descricao };
        try {
            await DataService.saveRecord('caixa', record, id || null);
            Helpers.closeModal('modal-caixa');
            await DataService.loadCaixa();
            atualizarDashboard();
            Helpers.showAlert(id ? 'Lançamento atualizado' : 'Lançamento salvo', 'success');
        } catch (e) { Helpers.handleError('salvar caixa', e); }
    },
    editar: async (id) => {
        const item = AppState.caixa.find(c => c.id === id);
        if (!item) return;
        Helpers.setValue('caixa-id', item.id);
        Helpers.setValue('caixa-data', item.data);
        Helpers.setValue('caixa-saldo-inicial', item.saldo_inicial);
        Helpers.setValue('caixa-entradas', item.entradas);
        Helpers.setValue('caixa-saidas', item.saidas);
        Helpers.setValue('caixa-descricao', item.descricao || '');
        Helpers.openModal('modal-caixa');
    },
    excluir: async (id) => {
        if (!confirm('Excluir este lançamento?')) return;
        try {
            await DataService.deleteRecord('caixa', id);
            await DataService.loadCaixa();
            atualizarDashboard();
            Helpers.showAlert('Lançamento excluído', 'success');
        } catch (e) { Helpers.handleError('excluir caixa', e); }
    },
    filtrar: () => {
        const termo = Helpers.getValue('search-caixa')?.toLowerCase() || '';
        const filtrado = termo
            ? AppState.caixa.filter(i => (i.descricao || '').toLowerCase().includes(termo))
            : AppState.caixa;
        Renderer.renderCaixa(filtrado);
    }
};

// --- SERVIÇOS ---
const ServicosModule = {
    abrirModal: () => {
        Helpers.clearForm('form-servico');
        Helpers.setValue('servico-data', new Date().toISOString().split('T')[0]);
        Helpers.openModal('modal-servico');
        ServicosModule.calcularRepasse();
    },
    calcularRepasse: () => {
        const valor = +Helpers.getValue('servico-valor') || 0;
        const tatuador = Helpers.getValue('servico-tatuador');
        const estudio = tatuador === 'Thalia' ? valor * 0.3 : 0;
        const repasse = tatuador === 'Thalia' ? valor * 0.7 : valor;
        const estudioSpan = Helpers.getElement('valor-estudio');
        const repasseSpan = Helpers.getElement('valor-repasse');
        if (estudioSpan) estudioSpan.innerText = Helpers.formatMoney(estudio);
        if (repasseSpan) repasseSpan.innerText = Helpers.formatMoney(repasse);
    },
    salvar: async () => {
        const id = Helpers.getValue('servico-id');
        const record = {
            data: Helpers.getValue('servico-data'),
            cliente: Helpers.getValue('servico-cliente'),
            tatuador_nome: Helpers.getValue('servico-tatuador'),
            tipo: Helpers.getValue('servico-tipo'),
            descricao: Helpers.getValue('servico-descricao'),
            valor_total: +Helpers.getValue('servico-valor') || 0,
            forma_pagamento: Helpers.getValue('servico-pagamento')
        };
        try {
            await DataService.saveRecord('servicos', record, id || null);
            Helpers.closeModal('modal-servico');
            await DataService.loadServicos();
            atualizarDashboard();
            
            // Se veio de um agendamento, marcar como Concluído
            if (window.pendingAgendaId) {
                await DataService.saveRecord('agenda', { status: 'Concluído' }, window.pendingAgendaId);
                await DataService.loadAgenda();
                Helpers.showAlert('Agendamento marcado como Concluído!', 'success');
                delete window.pendingAgendaId;
            }
            
            Helpers.showAlert(id ? 'Serviço atualizado' : 'Serviço salvo', 'success');
        } catch (e) { Helpers.handleError('salvar serviço', e); }
    },
    editar: async (id) => {
        const item = AppState.servicos.find(s => s.id === id);
        if (!item) return;
        Helpers.setValue('servico-id', item.id);
        Helpers.setValue('servico-data', item.data);
        Helpers.setValue('servico-cliente', item.cliente);
        Helpers.setValue('servico-tatuador', item.tatuador_nome);
        Helpers.setValue('servico-tipo', item.tipo);
        Helpers.setValue('servico-descricao', item.descricao || '');
        Helpers.setValue('servico-valor', item.valor_total);
        Helpers.setValue('servico-pagamento', item.forma_pagamento);
        Helpers.openModal('modal-servico');
        ServicosModule.calcularRepasse();
    },
    excluir: async (id) => {
        if (!confirm('Excluir este serviço?')) return;
        try {
            await DataService.deleteRecord('servicos', id);
            await DataService.loadServicos();
            atualizarDashboard();
            Helpers.showAlert('Serviço excluído', 'success');
        } catch (e) { Helpers.handleError('excluir serviço', e); }
    },
    filtrar: () => {
        let filtrado = [...AppState.servicos];
        const tatuador = Helpers.getValue('filtro-tatuador-servico');
        if (tatuador) filtrado = filtrado.filter(s => s.tatuador_nome === tatuador);
        const tipo = Helpers.getValue('filtro-tipo-servico');
        if (tipo) filtrado = filtrado.filter(s => s.tipo === tipo);
        const pagamento = Helpers.getValue('filtro-pagamento');
        if (pagamento) filtrado = filtrado.filter(s => s.forma_pagamento === pagamento);
        const data = Helpers.getValue('filtro-data-servico');
        if (data) filtrado = filtrado.filter(s => s.data === data);
        const termo = Helpers.getValue('search-servicos')?.toLowerCase() || '';
        if (termo) filtrado = filtrado.filter(s => s.cliente.toLowerCase().includes(termo) || (s.descricao || '').toLowerCase().includes(termo));
        Renderer.renderServicos(filtrado);
    },
    limparFiltros: () => {
        Helpers.setValue('filtro-tatuador-servico', '');
        Helpers.setValue('filtro-tipo-servico', '');
        Helpers.setValue('filtro-pagamento', '');
        Helpers.setValue('filtro-data-servico', '');
        Helpers.setValue('search-servicos', '');
        Renderer.renderServicos(AppState.servicos);
    }
};

// --- AGENDA ---
const AgendaModule = {
    abrirModal: () => {
        Helpers.clearForm('form-agenda');
        Helpers.setValue('agenda-data', new Date().toISOString().split('T')[0]);
        Helpers.openModal('modal-agenda');
    },
    salvar: async () => {
        const id = Helpers.getValue('agenda-id');
        const dataHora = `${Helpers.getValue('agenda-data')} ${Helpers.getValue('agenda-horario')}`;
        const record = {
            data_hora: dataHora,
            cliente: Helpers.getValue('agenda-cliente'),
            tatuador_nome: Helpers.getValue('agenda-tatuador'),
            tipo_servico: Helpers.getValue('agenda-tipo'),
            valor_estimado: +Helpers.getValue('agenda-valor') || 0,
            forma_pagamento: Helpers.getValue('agenda-pagamento'),
            status: Helpers.getValue('agenda-status'),
            observacoes: Helpers.getValue('agenda-obs')
        };
        try {
            await DataService.saveRecord('agenda', record, id || null);
            Helpers.closeModal('modal-agenda');
            await DataService.loadAgenda();
            atualizarDashboard();
            Helpers.showAlert(id ? 'Agendamento atualizado' : 'Agendamento salvo', 'success');
        } catch (e) { Helpers.handleError('salvar agenda', e); }
    },
    editar: async (id) => {
        const item = AppState.agenda.find(a => a.id === id);
        if (!item) return;
        const dt = new Date(item.data_hora);
        Helpers.setValue('agenda-id', item.id);
        Helpers.setValue('agenda-data', dt.toISOString().split('T')[0]);
        Helpers.setValue('agenda-horario', dt.toTimeString().slice(0, 5));
        Helpers.setValue('agenda-cliente', item.cliente);
        Helpers.setValue('agenda-tatuador', item.tatuador_nome);
        Helpers.setValue('agenda-tipo', item.tipo_servico);
        Helpers.setValue('agenda-valor', item.valor_estimado);
        Helpers.setValue('agenda-pagamento', item.forma_pagamento || 'PIX');
        Helpers.setValue('agenda-status', item.status);
        Helpers.setValue('agenda-obs', item.observacoes || '');
        Helpers.openModal('modal-agenda');
    },
    excluir: async (id) => {
        if (!confirm('Excluir este agendamento?')) return;
        try {
            await DataService.deleteRecord('agenda', id);
            await DataService.loadAgenda();
            atualizarDashboard();
            Helpers.showAlert('Agendamento excluído', 'success');
        } catch (e) { Helpers.handleError('excluir agenda', e); }
    },
    realizarServico: async (id) => {
        const item = AppState.agenda.find(a => a.id === id);
        if (!item) return;
        // Pré-preenche o modal de serviço
        Helpers.setValue('servico-data', item.data_hora.split('T')[0]);
        Helpers.setValue('servico-cliente', item.cliente);
        Helpers.setValue('servico-tatuador', item.tatuador_nome);
        Helpers.setValue('servico-tipo', item.tipo_servico);
        Helpers.setValue('servico-descricao', item.observacoes || '');
        Helpers.setValue('servico-valor', item.valor_estimado);
        Helpers.setValue('servico-pagamento', item.forma_pagamento || 'PIX');
        ServicosModule.calcularRepasse();
        window.pendingAgendaId = id;
        Helpers.openModal('modal-servico');
    },
    filtrar: () => {
        let filtrado = [...AppState.agenda];
        const tatuador = Helpers.getValue('filtro-tatuador-agenda');
        if (tatuador) filtrado = filtrado.filter(a => a.tatuador_nome === tatuador);
        const status = Helpers.getValue('filtro-status-agenda');
        if (status) filtrado = filtrado.filter(a => a.status === status);
        const data = Helpers.getValue('filtro-data-agenda');
        if (data) filtrado = filtrado.filter(a => a.data_hora.startsWith(data));
        Renderer.renderAgenda(filtrado);
    },
    filtrarHoje: () => {
        const dataInput = Helpers.getElement('filtro-data-agenda');
        if (dataInput) dataInput.valueAsDate = new Date();
        AgendaModule.filtrar();
    },
    limparFiltros: () => {
        Helpers.setValue('filtro-tatuador-agenda', '');
        Helpers.setValue('filtro-status-agenda', '');
        Helpers.setValue('filtro-data-agenda', '');
        Renderer.renderAgenda(AppState.agenda);
    }
};

// --- PIERCING ---
const PiercingModule = {
    abrirModal: (id = null) => {
        Helpers.clearForm('form-piercing');
        if (id) {
            supabaseClient.from('piercings_estoque').select('*').eq('id', id).single()
                .then(({ data }) => {
                    if (data) {
                        Helpers.setValue('piercing-id', data.id);
                        Helpers.setValue('piercing-nome', data.nome);
                        Helpers.setValue('piercing-qtd', data.quantidade);
                        Helpers.setValue('piercing-preco', data.preco_venda);
                        Helpers.openModal('modal-piercing');
                    }
                })
                .catch(e => Helpers.handleError('carregar piercing', e));
        } else {
            Helpers.openModal('modal-piercing');
        }
    },
    salvar: async () => {
        const id = Helpers.getValue('piercing-id');
        const nome = Helpers.getValue('piercing-nome');
        const quantidade = parseInt(Helpers.getValue('piercing-qtd')) || 0;
        const preco_venda = parseFloat(Helpers.getValue('piercing-preco')) || 0;
        if (!nome) return Helpers.showAlert('Nome obrigatório', 'error');
        try {
            await DataService.saveRecord('piercings_estoque', { nome, quantidade, preco_venda }, id || null);
            Helpers.closeModal('modal-piercing');
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            Helpers.showAlert('Piercing salvo', 'success');
        } catch (e) { Helpers.handleError('salvar piercing', e); }
    },
    editar: (id) => PiercingModule.abrirModal(id),
    excluir: async (id) => {
        if (!confirm('Excluir este piercing?')) return;
        try {
            await DataService.deleteRecord('piercings_estoque', id);
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            Helpers.showAlert('Piercing excluído', 'success');
        } catch (e) { Helpers.handleError('excluir piercing', e); }
    },
    registrarVenda: async () => {
        const piercingId = Helpers.getValue('venda-piercing-id');
        const quantidade = parseInt(Helpers.getValue('venda-qtd')) || 0;
        const cliente = Helpers.getValue('venda-cliente');
        if (!piercingId) return Helpers.showAlert('Selecione um piercing', 'error');
        if (quantidade <= 0) return Helpers.showAlert('Quantidade deve ser maior que zero', 'error');
        try {
            const { data: piercing, error } = await supabaseClient.from('piercings_estoque').select('*').eq('id', piercingId).single();
            if (error) throw error;
            if (!piercing || piercing.quantidade < quantidade) throw new Error('Estoque insuficiente');
            const valorTotal = quantidade * piercing.preco_venda;
            await supabaseClient.from('piercings_estoque').update({ quantidade: piercing.quantidade - quantidade }).eq('id', piercingId);
            await supabaseClient.from('vendas_piercing').insert([{ piercing_id: piercingId, quantidade, valor_total: valorTotal, cliente: cliente || null }]);
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            Helpers.setValue('venda-qtd', 1);
            Helpers.setValue('venda-cliente', '');
            Helpers.showAlert(`Venda registrada: ${Helpers.formatMoney(valorTotal)}`, 'success');
        } catch (e) { Helpers.handleError('venda piercing', e); }
    }
};

// --- MATERIAIS ---
const MateriaisModule = {
    abrirModal: (id = null) => {
        Helpers.clearForm('form-material');
        if (id) {
            supabaseClient.from('materiais_estoque').select('*').eq('id', id).single()
                .then(({ data }) => {
                    if (data) {
                        Helpers.setValue('material-id', data.id);
                        Helpers.setValue('material-nome', data.nome);
                        Helpers.setValue('material-qtd', data.quantidade);
                        Helpers.setValue('material-preco', data.valor_unitario);
                        Helpers.openModal('modal-material');
                    }
                })
                .catch(e => Helpers.handleError('carregar material', e));
        } else {
            Helpers.openModal('modal-material');
        }
    },
    salvar: async () => {
        const id = Helpers.getValue('material-id');
        const nome = Helpers.getValue('material-nome');
        const quantidade = parseInt(Helpers.getValue('material-qtd')) || 0;
        const valor_unitario = parseFloat(Helpers.getValue('material-preco')) || 0;
        if (!nome) return Helpers.showAlert('Nome obrigatório', 'error');
        try {
            await DataService.saveRecord('materiais_estoque', { nome, quantidade, valor_unitario }, id || null);
            Helpers.closeModal('modal-material');
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            Helpers.showAlert('Material salvo', 'success');
        } catch (e) { Helpers.handleError('salvar material', e); }
    },
    editar: (id) => MateriaisModule.abrirModal(id),
    excluir: async (id) => {
        if (!confirm('Excluir este material?')) return;
        try {
            await DataService.deleteRecord('materiais_estoque', id);
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            Helpers.showAlert('Material excluído', 'success');
        } catch (e) { Helpers.handleError('excluir material', e); }
    },
    registrarUso: async () => {
        const materialId = Helpers.getValue('uso-material-id');
        const quantidade = parseInt(Helpers.getValue('uso-qtd')) || 0;
        const observacao = Helpers.getValue('uso-obs');
        if (!materialId) return Helpers.showAlert('Selecione um material', 'error');
        if (quantidade <= 0) return Helpers.showAlert('Quantidade deve ser maior que zero', 'error');
        try {
            const { data: material, error } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
            if (error) throw error;
            if (!material || material.quantidade < quantidade) throw new Error('Quantidade insuficiente');
            await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade - quantidade }).eq('id', materialId);
            await supabaseClient.from('usos_materiais').insert([{ material_id: materialId, quantidade, observacao: observacao || null }]);
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            Helpers.setValue('uso-qtd', 1);
            Helpers.setValue('uso-obs', '');
            Helpers.showAlert(`Uso de ${quantidade} unidade(s) de ${material.nome} registrado`, 'success');
        } catch (e) { Helpers.handleError('uso material', e); }
    }
};

// --- BACKUP ---
const BackupModule = {
    exportar: async () => {
        try {
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];
            const backup = { data_exportacao: new Date().toISOString() };
            for (const tabela of tabelas) {
                const { data } = await supabaseClient.from(tabela).select('*');
                backup[tabela] = data || [];
            }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `backup-dark013-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            Helpers.showAlert('Backup exportado', 'success');
        } catch (e) { Helpers.handleError('exportar backup', e); }
    },
    importar: async (input) => {
        const file = input.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            if (!backup.servicos && !backup.agenda && !backup.caixa) throw new Error('Arquivo inválido');
            if (!confirm(`Importar backup de ${backup.data_exportacao}? Isso pode duplicar dados.`)) return;
            const tabelas = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];
            for (const tabela of tabelas) {
                const registros = backup[tabela] || [];
                for (const reg of registros) {
                    const { id, ...rest } = reg;
                    await supabaseClient.from(tabela).insert([rest]);
                }
            }
            Helpers.showAlert('Backup importado com sucesso', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (e) { Helpers.handleError('importar backup', e); }
        input.value = '';
    }
};

// --- EXEMPLOS ---
const ExemplosModule = {
    popularPiercings: async () => {
        if (!confirm('Isso irá adicionar piercings de exemplo (não remove os existentes). Continuar?')) return;
        const exemplos = [
            { nome: 'Piercing Nariz Cristal', quantidade: 10, preco_venda: 80.00 },
            { nome: 'Piercing Septo Aço', quantidade: 8, preco_venda: 120.00 },
            { nome: 'Piercing Lábio Argola', quantidade: 5, preco_venda: 70.00 },
            { nome: 'Piercing Tragus Pérola', quantidade: 12, preco_venda: 90.00 },
            { nome: 'Piercing Indústrial Barra', quantidade: 6, preco_venda: 110.00 }
        ];
        try {
            for (const item of exemplos) {
                const { data: existente } = await supabaseClient.from('piercings_estoque').select('id').eq('nome', item.nome).maybeSingle();
                if (!existente) {
                    await supabaseClient.from('piercings_estoque').insert([item]);
                }
            }
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
            Helpers.showAlert('Piercings de exemplo adicionados!', 'success');
        } catch (e) { Helpers.handleError('exemplos piercings', e); }
    },
    popularMateriais: async () => {
        if (!confirm('Isso irá adicionar materiais de exemplo (não remove os existentes). Continuar?')) return;
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
            for (const item of exemplos) {
                const { data: existente } = await supabaseClient.from('materiais_estoque').select('id').eq('nome', item.nome).maybeSingle();
                if (!existente) {
                    await supabaseClient.from('materiais_estoque').insert([item]);
                }
            }
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
            Helpers.showAlert('Materiais de exemplo adicionados!', 'success');
        } catch (e) { Helpers.handleError('exemplos materiais', e); }
    }
};

// ==================== NAVEGAÇÃO E INICIALIZAÇÃO ====================
async function testarConexao() {
    const statusEl = Helpers.getElement('status-nuvem');
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
        Helpers.handleError('conexão', err);
        return false;
    }
}

async function carregarDadosSecao(sectionId) {
    const carregamentos = {
        dashboard: async () => {
            await DataService.loadCaixa();
            await DataService.loadServicos();
            await DataService.loadAgenda();
            atualizarDashboard();
        },
        caixa: DataService.loadCaixa,
        servicos: DataService.loadServicos,
        agenda: DataService.loadAgenda,
        relatorios: carregarRelatorios,
        piercing: async () => {
            await DataService.loadPiercings();
            await DataService.loadVendasPiercing();
        },
        materiais: async () => {
            await DataService.loadMateriais();
            await DataService.loadUsosMateriais();
        }
    };
    if (carregamentos[sectionId]) await carregamentos[sectionId]();
}

function setupNavigation() {
    document.querySelectorAll('.nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const targetSection = Helpers.getElement(sectionId);
            if (targetSection) targetSection.classList.add('active');
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarDadosSecao(sectionId);
        });
    });
}

function setupEventListeners() {
    const searchCaixa = Helpers.getElement('search-caixa');
    if (searchCaixa) {
        searchCaixa.addEventListener('input', () => CaixaModule.filtrar());
    }
}

// Fechar modais ao clicar fora
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// EXPORTAÇÃO GLOBAL DAS FUNÇÕES USADAS NO HTML
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

window.fecharModal = Helpers.closeModal;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        Helpers.showAlert('Supabase não disponível. Verifique sua conexão.', 'error');
        return;
    }
    const conectado = await testarConexao();
    if (!conectado) return;

    setupNavigation();
    setupEventListeners();

    await DataService.loadCaixa();
    await DataService.loadServicos();
    await DataService.loadAgenda();
    await DataService.loadPiercings();
    await DataService.loadVendasPiercing();
    await DataService.loadMateriais();
    await DataService.loadUsosMateriais();
    atualizarDashboard();
});