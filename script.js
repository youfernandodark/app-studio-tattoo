// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou');
    document.getElementById('status-nuvem').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro: Supabase não carregou';
}

// ==================== GLOBAL STATE ====================
let currentData = { servicos: [], agenda: [], transacoes: [], formasPagamento: [] };
let chartFaturamento = null, chartTipos = null;
let pagamentosLinhas = []; // armazena os pagamentos temporários do formulário de serviço

// ==================== HELPER FUNCTIONS ====================
function formatMoney(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v||0); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }
function formatDateTime(d) { if(!d)return '-'; const dt=new Date(d); return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function showAlert(msg,type) { 
    const a=document.createElement('div'); a.className=`alert alert-${type}`; 
    a.innerHTML=`<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`; 
    a.style.display='block'; document.getElementById('alert-container').appendChild(a); 
    setTimeout(()=>a.remove(),4500);
}

async function testarConexao() {
    if (!supabaseClient) return false;
    const statusEl = document.getElementById('status-nuvem');
    try {
        const { error } = await supabaseClient.from('formas_pagamento').select('id').limit(1);
        if (error) throw error;
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Conectado ao Supabase';
        statusEl.className = 'status-badge status-connected';
        return true;
    } catch (err) {
        console.error(err);
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Falha na conexão';
        statusEl.className = 'status-badge status-error';
        showAlert('Erro de conexão: ' + err.message, 'error');
        return false;
    }
}

// ==================== DATA LOADING (NOVAS TABELAS) ====================
async function carregarFormasPagamento() {
    const { data, error } = await supabaseClient.from('formas_pagamento').select('*').order('id');
    if (!error) currentData.formasPagamento = data;
    return currentData.formasPagamento;
}

async function carregarTransacoes() {
    const { data, error } = await supabaseClient.from('transacoes').select('*').order('data', { ascending: false });
    if (!error) currentData.transacoes = data || [];
    renderizarTransacoes(); // exibe como resumo diário
    return currentData.transacoes;
}

async function carregarServicos() {
    const { data, error } = await supabaseClient.from('servicos').select('*').order('data', { ascending: false });
    if (!error) currentData.servicos = data || [];
    renderizarServicos(currentData.servicos);
}
async function carregarAgenda() {
    const { data, error } = await supabaseClient.from('agenda').select('*').order('data_hora');
    if (!error) currentData.agenda = data || [];
    renderizarAgenda(currentData.agenda);
}
async function carregarPiercings() {
    const { data, error } = await supabaseClient.from('piercings_estoque').select('*').order('nome');
    if (!error) renderizarEstoquePiercing(data || []);
}
async function carregarVendasPiercing() {
    const { data, error } = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data', { ascending: false });
    if (!error) renderizarVendasPiercing(data || []);
}
async function carregarMateriais() {
    const { data, error } = await supabaseClient.from('materiais_estoque').select('*').order('nome');
    if (!error) renderizarEstoqueMaterial(data || []);
}
async function carregarUsosMateriais() {
    const { data, error } = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data', { ascending: false });
    if (!error) renderizarUsosMateriais(data || []);
}

// ==================== RENDER: TRANSAÇÕES (CAIXA) ====================
function renderizarTransacoes() {
    // Agrupa transações por data e calcula resumo diário
    const resumoMap = new Map();
    for (const t of currentData.transacoes) {
        const data = t.data;
        if (!resumoMap.has(data)) {
            resumoMap.set(data, { data, entradas: 0, saidas: 0, transacoes: [] });
        }
        const grupo = resumoMap.get(data);
        if (t.tipo === 'entrada') grupo.entradas += t.valor;
        else grupo.saidas += t.valor;
        grupo.transacoes.push(t);
    }
    // Ordena por data decrescente
    const resumoOrdenado = Array.from(resumoMap.values()).sort((a,b) => new Date(b.data) - new Date(a.data));
    
    let saldoAcumulado = 0;
    const tbody = document.getElementById('caixa-tbody');
    tbody.innerHTML = '';
    let totalEntradas = 0, totalSaidas = 0;
    
    for (const dia of resumoOrdenado) {
        saldoAcumulado += dia.entradas - dia.saidas;
        totalEntradas += dia.entradas;
        totalSaidas += dia.saidas;
        tbody.innerHTML += `
            <tr style="background:#2a2a2a; cursor:pointer;" onclick="toggleDetalhesTransacoes('${dia.data}')">
                <td>${formatDate(dia.data)}</td>
                <td>${formatMoney(dia.entradas)}</td>
                <td style="color:#F87171">${formatMoney(dia.saidas)}</td>
                <td>${formatMoney(saldoAcumulado)}</td>
                <td colspan="3"><i class="fas fa-plus-circle"></i> Ver detalhes</td>
            </tr>
            <tr id="detalhes-${dia.data}" style="display:none;">
                <td colspan="7">
                    <table class="table-detalhes">
                        <thead><tr><th>Horário</th><th>Tipo</th><th>Valor</th><th>Forma Pagto</th><th>Descrição</th><th>Origem</th></tr></thead>
                        <tbody>
                            ${dia.transacoes.map(t => `
                                <tr>
                                    <td>${formatDateTime(t.created_at)}</td>
                                    <td>${t.tipo === 'entrada' ? '<span style="color:#34D399">Entrada</span>' : '<span style="color:#F87171">Saída</span>'}</td>
                                    <td>${formatMoney(t.valor)}</td>
                                    <td>${currentData.formasPagamento.find(fp => fp.id === t.forma_pagamento_id)?.nome || '-'}</td>
                                    <td>${t.descricao || '-'}</td>
                                    <td>${t.origem || 'manual'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </td>
            </tr>
        `;
    }
    document.getElementById('caixa-total-entradas').innerText = formatMoney(totalEntradas);
    document.getElementById('caixa-total-saidas').innerText = formatMoney(totalSaidas);
    document.getElementById('caixa-saldo-final').innerText = formatMoney(saldoAcumulado);
}

window.toggleDetalhesTransacoes = (data) => {
    const row = document.getElementById(`detalhes-${data}`);
    if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
};

// ==================== RENDER: SERVIÇOS (com múltiplos pagamentos) ====================
function renderizarServicos(data) {
    let totalV = 0, totalE = 0, totalR = 0;
    const tbody = document.getElementById('servicos-tbody');
    tbody.innerHTML = '';
    for (const s of data) {
        const val = +s.valor_total || 0;
        const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : 0;
        const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : val;
        totalV += val; totalE += estudio; totalR += repasse;
        tbody.innerHTML += `
            <tr>
                <td>${formatDate(s.data)}</td>
                <td>${s.cliente}</td>
                <td>${s.tatuador_nome}</td>
                <td>${s.tipo}</td>
                <td>${s.descricao || '-'}</td>
                <td>${formatMoney(val)}</td>
                <td>${formatMoney(estudio)}</td>
                <td style="color:#34D399">${formatMoney(repasse)}</td>
                <td><button class="btn btn-sm btn-info" onclick="verPagamentosServico('${s.id}')">Ver Pagtos</button></td>
                <td><button class="btn btn-warning btn-sm" onclick="editarServico('${s.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirServico('${s.id}')">Excluir</button></td>
            </tr>
        `;
    }
    document.getElementById('servicos-total-valor').innerText = formatMoney(totalV);
    document.getElementById('servicos-total-estudio').innerText = formatMoney(totalE);
    document.getElementById('servicos-total-repasse').innerText = formatMoney(totalR);
}

window.verPagamentosServico = async (servicoId) => {
    const { data: pagamentos, error } = await supabaseClient
        .from('pagamentos_servicos')
        .select('*, forma_pagamento:formas_pagamento(nome, taxa)')
        .eq('servico_id', servicoId);
    if (error) return showAlert('Erro ao carregar pagamentos', 'error');
    let html = '<h4>Pagamentos</h4><ul>';
    for (const p of pagamentos) {
        html += `<li>${p.forma_pagamento.nome}: R$ ${p.valor_bruto.toFixed(2)} (taxa ${p.taxa_aplicada}% → líquido R$ ${p.valor_liquido.toFixed(2)})</li>`;
    }
    html += '</ul>';
    showAlert(html, 'info');
};

// ==================== RENDER: AGENDA (sem alterações) ====================
function renderizarAgenda(data) {
    const tbody = document.getElementById('agenda-tbody');
    tbody.innerHTML = '';
    if (data.length === 0) tbody.innerHTML = '<tr><td colspan="8">Nenhum agendamento</td></tr>';
    else data.forEach(a => {
        const statusClass = { Agendado: 'status-warning', Confirmado: 'status-info', Concluído: 'status-success', Cancelado: 'status-danger' }[a.status];
        let confirmBtn = (a.status === 'Agendado') ? `<button class="btn btn-success btn-sm" onclick="confirmarAgendamento('${a.id}')"><i class="fas fa-check"></i> Confirmar</button> ` : '';
        tbody.innerHTML += `
            <tr>
                <td>${formatDateTime(a.data_hora)}</td>
                <td>${a.cliente}</td>
                <td>${a.tatuador_nome}</td>
                <td>${a.tipo_servico}</td>
                <td>${formatMoney(a.valor_estimado)}</td>
                <td><span class="status-badge-item ${statusClass}">${a.status}</span></td>
                <td>${a.observacoes || '-'}</td>
                <td>${confirmBtn}<button class="btn btn-warning btn-sm" onclick="editarAgenda('${a.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirAgenda('${a.id}')">Excluir</button></td>
            </tr>
        `;
    });
}

// ==================== CRUD: CAIXA (TRANSAÇÕES MANUAIS) ====================
window.abrirModalCaixa = () => {
    document.getElementById('caixa-id').value = '';
    document.getElementById('caixa-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-caixa').style.display = 'block';
};
window.salvarCaixa = async () => {
    const data = document.getElementById('caixa-data').value;
    const tipo = document.getElementById('caixa-tipo').value; // 'entrada' ou 'saida'
    const valor = parseFloat(document.getElementById('caixa-valor').value) || 0;
    const descricao = document.getElementById('caixa-descricao').value;
    const formaPagamentoId = document.getElementById('caixa-forma-pagamento').value;
    if (!data || !tipo || valor <= 0) return showAlert('Preencha todos os campos', 'error');
    try {
        const { error } = await supabaseClient.from('transacoes').insert([{
            data, tipo, valor, descricao, origem: 'manual',
            forma_pagamento_id: formaPagamentoId || null
        }]);
        if (error) throw error;
        fecharModal('modal-caixa');
        await carregarTransacoes();
        atualizarDashboard();
        showAlert('Lançamento salvo', 'success');
    } catch (e) { showAlert('Erro: ' + e.message, 'error'); }
};
window.filtrarCaixa = () => {
    const search = document.getElementById('search-caixa').value.toLowerCase();
    const filtered = currentData.transacoes.filter(t => (t.descricao || '').toLowerCase().includes(search));
    // Re-agrupa e renderiza apenas as transações filtradas
    renderizarTransacoesFiltered(filtered);
};
function renderizarTransacoesFiltered(transacoes) {
    // similar a renderizarTransacoes, mas usando o array filtrado
    const resumoMap = new Map();
    for (const t of transacoes) {
        const data = t.data;
        if (!resumoMap.has(data)) resumoMap.set(data, { data, entradas: 0, saidas: 0, transacoes: [] });
        const grupo = resumoMap.get(data);
        if (t.tipo === 'entrada') grupo.entradas += t.valor;
        else grupo.saidas += t.valor;
        grupo.transacoes.push(t);
    }
    const resumoOrdenado = Array.from(resumoMap.values()).sort((a,b) => new Date(b.data) - new Date(a.data));
    let saldoAcumulado = 0;
    const tbody = document.getElementById('caixa-tbody');
    tbody.innerHTML = '';
    let totalEntradas = 0, totalSaidas = 0;
    for (const dia of resumoOrdenado) {
        saldoAcumulado += dia.entradas - dia.saidas;
        totalEntradas += dia.entradas;
        totalSaidas += dia.saidas;
        tbody.innerHTML += `<tr><td>${formatDate(dia.data)}</td><td>${formatMoney(dia.entradas)}</td><td>${formatMoney(dia.saidas)}</td><td>${formatMoney(saldoAcumulado)}</td><td colspan="3">-</td></tr>`;
    }
    document.getElementById('caixa-total-entradas').innerText = formatMoney(totalEntradas);
    document.getElementById('caixa-total-saidas').innerText = formatMoney(totalSaidas);
    document.getElementById('caixa-saldo-final').innerText = formatMoney(saldoAcumulado);
}

// ==================== CRUD: SERVIÇOS COM MÚLTIPLOS PAGAMENTOS ====================
async function carregarPagamentosServico(servicoId) {
    const { data } = await supabaseClient.from('pagamentos_servicos').select('*').eq('servico_id', servicoId);
    return data || [];
}

window.abrirModalServico = async () => {
    document.getElementById('servico-id').value = '';
    document.getElementById('servico-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('servico-cliente').value = '';
    document.getElementById('servico-valor').value = '';
    pagamentosLinhas = [];
    renderizarLinhasPagamento();
    document.getElementById('modal-servico').style.display = 'block';
    calcularRepasse();
};

function renderizarLinhasPagamento() {
    const container = document.getElementById('pagamentos-container');
    if (!container) return;
    if (pagamentosLinhas.length === 0) {
        pagamentosLinhas.push({ formaPagamentoId: '', valor: 0 });
    }
    container.innerHTML = pagamentosLinhas.map((linha, idx) => `
        <div class="pagamento-linha" style="display:flex; gap:8px; margin-bottom:8px;">
            <select class="forma-pagamento" data-idx="${idx}" style="flex:2">
                <option value="">Selecione</option>
                ${currentData.formasPagamento.map(fp => `<option value="${fp.id}" data-taxa="${fp.taxa}" ${linha.formaPagamentoId == fp.id ? 'selected' : ''}>${fp.nome} (${fp.taxa}%)</option>`).join('')}
            </select>
            <input type="number" class="valor-pagamento" data-idx="${idx}" placeholder="Valor R$" step="0.01" value="${linha.valor || ''}" style="flex:1">
            <span class="valor-liquido-preview" data-idx="${idx}" style="flex:1">Líquido: R$ 0,00</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removerLinhaPagamento(${idx})">-</button>
        </div>
    `).join('');
    document.getElementById('btn-add-pagamento').style.display = pagamentosLinhas.length < 5 ? 'inline-block' : 'none';
    // Reattach event listeners
    document.querySelectorAll('.forma-pagamento').forEach(sel => sel.addEventListener('change', (e) => atualizarPreviewLinha(e.target.dataset.idx)));
    document.querySelectorAll('.valor-pagamento').forEach(inp => inp.addEventListener('input', (e) => atualizarPreviewLinha(e.target.dataset.idx)));
    atualizarTotalPagamentos();
}

window.adicionarLinhaPagamento = () => {
    if (pagamentosLinhas.length >= 5) return showAlert('Máximo 5 formas de pagamento', 'error');
    pagamentosLinhas.push({ formaPagamentoId: '', valor: 0 });
    renderizarLinhasPagamento();
};
window.removerLinhaPagamento = (idx) => {
    pagamentosLinhas.splice(idx, 1);
    renderizarLinhasPagamento();
};
function atualizarPreviewLinha(idx) {
    const select = document.querySelector(`.forma-pagamento[data-idx="${idx}"]`);
    const input = document.querySelector(`.valor-pagamento[data-idx="${idx}"]`);
    const previewSpan = document.querySelector(`.valor-liquido-preview[data-idx="${idx}"]`);
    if (!select || !input || !previewSpan) return;
    const formaId = select.value;
    const valorBruto = parseFloat(input.value) || 0;
    const taxa = formaId ? parseFloat(select.options[select.selectedIndex]?.dataset.taxa || 0) : 0;
    const valorLiquido = valorBruto * (1 - taxa / 100);
    previewSpan.innerText = `Líquido: ${formatMoney(valorLiquido)}`;
    pagamentosLinhas[idx] = { formaPagamentoId: formaId, valor: valorBruto };
    atualizarTotalPagamentos();
}
function atualizarTotalPagamentos() {
    const totalBruto = pagamentosLinhas.reduce((sum, p) => sum + (p.valor || 0), 0);
    document.getElementById('total-pagamentos-bruto').innerText = formatMoney(totalBruto);
    const totalLiquido = pagamentosLinhas.reduce((sum, p) => {
        const forma = currentData.formasPagamento.find(fp => fp.id == p.formaPagamentoId);
        const taxa = forma ? forma.taxa : 0;
        return sum + (p.valor || 0) * (1 - taxa / 100);
    }, 0);
    document.getElementById('total-pagamentos-liquido').innerText = formatMoney(totalLiquido);
    const valorServico = parseFloat(document.getElementById('servico-valor').value) || 0;
    if (Math.abs(totalBruto - valorServico) > 0.01 && valorServico > 0) {
        document.getElementById('aviso-pagamentos').innerHTML = '<small style="color:#F87171">⚠️ Soma dos pagamentos diferente do valor total do serviço</small>';
    } else {
        document.getElementById('aviso-pagamentos').innerHTML = '';
    }
}

window.calcularRepasse = () => {
    const val = +document.getElementById('servico-valor').value || 0;
    const tatuador = document.getElementById('servico-tatuador').value;
    const estudio = tatuador === 'Thalia' ? val * 0.3 : 0;
    const repasse = tatuador === 'Thalia' ? val * 0.7 : val;
    document.getElementById('valor-estudio').innerText = formatMoney(estudio);
    document.getElementById('valor-repasse').innerText = formatMoney(repasse);
    atualizarTotalPagamentos();
};

window.salvarServico = async () => {
    const id = document.getElementById('servico-id').value;
    const data = document.getElementById('servico-data').value;
    const cliente = document.getElementById('servico-cliente').value;
    const tatuador = document.getElementById('servico-tatuador').value;
    const tipo = document.getElementById('servico-tipo').value;
    const descricao = document.getElementById('servico-descricao').value;
    const valorTotal = parseFloat(document.getElementById('servico-valor').value) || 0;
    const formaPagamentoAntiga = document.getElementById('servico-pagamento-antigo').value; // campo oculto mantido para compatibilidade

    // Validar pagamentos
    const somaBruta = pagamentosLinhas.reduce((s, p) => s + (p.valor || 0), 0);
    if (Math.abs(somaBruta - valorTotal) > 0.01) {
        return showAlert('A soma dos pagamentos deve ser igual ao valor total do serviço', 'error');
    }

    try {
        let servicoId = id;
        const servicoData = { data, cliente, tatuador_nome: tatuador, tipo, descricao, valor_total: valorTotal, forma_pagamento: 'Múltiplas' };
        if (id) {
            await supabaseClient.from('servicos').update(servicoData).eq('id', id);
        } else {
            const { data: inserted, error } = await supabaseClient.from('servicos').insert([servicoData]).select();
            if (error) throw error;
            servicoId = inserted[0].id;
        }

        // Remover pagamentos antigos e transações de caixa vinculadas
        const oldPayments = await carregarPagamentosServico(servicoId);
        for (const old of oldPayments) {
            // Remover transação correspondente no caixa
            await supabaseClient.from('transacoes').delete().eq('origem', 'servico').eq('referencia_id', servicoId).eq('forma_pagamento_id', old.forma_pagamento_id);
        }
        await supabaseClient.from('pagamentos_servicos').delete().eq('servico_id', servicoId);

        // Inserir novos pagamentos e transações
        for (const p of pagamentosLinhas) {
            if (!p.formaPagamentoId || p.valor <= 0) continue;
            const forma = currentData.formasPagamento.find(fp => fp.id == p.formaPagamentoId);
            const taxa = forma ? forma.taxa : 0;
            const valorLiquido = p.valor * (1 - taxa / 100);
            await supabaseClient.from('pagamentos_servicos').insert([{
                servico_id: servicoId,
                forma_pagamento_id: p.formaPagamentoId,
                valor_bruto: p.valor,
                taxa_aplicada: taxa,
                valor_liquido: valorLiquido
            }]);
            // Lançar entrada no caixa
            await supabaseClient.from('transacoes').insert([{
                data: data,
                tipo: 'entrada',
                valor: valorLiquido,
                descricao: `Serviço - ${cliente} (${forma.nome})`,
                origem: 'servico',
                referencia_id: servicoId,
                forma_pagamento_id: p.formaPagamentoId
            }]);
        }

        fecharModal('modal-servico');
        await carregarServicos();
        await carregarTransacoes();
        atualizarDashboard();
        showAlert(id ? 'Serviço atualizado' : 'Serviço salvo', 'success');
    } catch (e) { showAlert('Erro: ' + e.message, 'error'); }
};

window.editarServico = async (id) => {
    const servico = currentData.servicos.find(s => s.id === id);
    if (!servico) return;
    document.getElementById('servico-id').value = servico.id;
    document.getElementById('servico-data').value = servico.data;
    document.getElementById('servico-cliente').value = servico.cliente;
    document.getElementById('servico-tatuador').value = servico.tatuador_nome;
    document.getElementById('servico-tipo').value = servico.tipo;
    document.getElementById('servico-descricao').value = servico.descricao || '';
    document.getElementById('servico-valor').value = servico.valor_total;
    document.getElementById('servico-pagamento-antigo').value = servico.forma_pagamento; // compatibilidade

    const pagamentos = await carregarPagamentosServico(id);
    pagamentosLinhas = pagamentos.map(p => ({ formaPagamentoId: p.forma_pagamento_id, valor: p.valor_bruto }));
    renderizarLinhasPagamento();
    document.getElementById('modal-servico').style.display = 'block';
    calcularRepasse();
};

window.excluirServico = async (id) => {
    if (!confirm('Excluir serviço? Todas as transações de caixa e pagamentos serão removidos.')) return;
    try {
        await supabaseClient.from('pagamentos_servicos').delete().eq('servico_id', id);
        await supabaseClient.from('transacoes').delete().eq('origem', 'servico').eq('referencia_id', id);
        await supabaseClient.from('servicos').delete().eq('id', id);
        await carregarServicos();
        await carregarTransacoes();
        atualizarDashboard();
        showAlert('Serviço excluído', 'success');
    } catch (e) { showAlert('Erro: ' + e.message, 'error'); }
};

// ==================== PIERCING: VENDAS COM PAGAMENTO ====================
window.registrarVendaPiercing = async () => {
    const piercingId = document.getElementById('venda-piercing-id').value;
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;
    const formaPagamentoId = document.getElementById('venda-forma-pagamento').value;
    if (!piercingId || !formaPagamentoId || qtd <= 0) return showAlert('Preencha todos os campos', 'error');
    try {
        const { data: piercing } = await supabaseClient.from('piercings_estoque').select('*').eq('id', piercingId).single();
        if (!piercing || piercing.quantidade < qtd) return showAlert('Estoque insuficiente', 'error');
        const valorTotal = qtd * piercing.preco_venda;
        const forma = currentData.formasPagamento.find(fp => fp.id == formaPagamentoId);
        const taxa = forma ? forma.taxa : 0;
        const valorLiquido = valorTotal * (1 - taxa / 100);
        const { error: upd } = await supabaseClient.from('piercings_estoque').update({ quantidade: piercing.quantidade - qtd }).eq('id', piercingId);
        if (upd) throw upd;
        const { data: venda, error: vendaError } = await supabaseClient.from('vendas_piercing').insert([{
            piercing_id: piercingId, quantidade: qtd, valor_total: valorTotal, cliente: cliente || null,
            forma_pagamento_id: formaPagamentoId, valor_liquido: valorLiquido, taxa_aplicada: taxa
        }]).select();
        if (vendaError) throw vendaError;
        // Lançar transação no caixa
        await supabaseClient.from('transacoes').insert([{
            data: new Date().toISOString().split('T')[0],
            tipo: 'entrada',
            valor: valorLiquido,
            descricao: `Venda piercing - ${piercing.nome} x${qtd} (${forma.nome})`,
            origem: 'venda_piercing',
            referencia_id: venda[0].id,
            forma_pagamento_id: formaPagamentoId
        }]);
        await carregarPiercings();
        await carregarVendasPiercing();
        await carregarTransacoes();
        showAlert(`Venda registrada: ${formatMoney(valorLiquido)} líquido`, 'success');
    } catch (e) { showAlert('Erro: ' + e.message, 'error'); }
};

// ==================== MATERIAIS: USO COM SAÍDA DE CAIXA (opcional) ====================
window.registrarUsoMaterial = async () => {
    const materialId = document.getElementById('uso-material-id').value;
    const qtd = parseInt(document.getElementById('uso-qtd').value);
    const obs = document.getElementById('uso-obs').value;
    if (!materialId || qtd <= 0) return showAlert('Selecione material e quantidade', 'error');
    try {
        const { data: material } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
        if (!material || material.quantidade < qtd) return showAlert('Quantidade insuficiente', 'error');
        const custoTotal = qtd * material.valor_unitario;
        const { error: upd } = await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade - qtd }).eq('id', materialId);
        if (upd) throw upd;
        await supabaseClient.from('usos_materiais').insert([{ material_id: materialId, quantidade: qtd, observacao: obs || null }]);
        // Opcional: registrar saída no caixa (custo)
        if (custoTotal > 0) {
            await supabaseClient.from('transacoes').insert([{
                data: new Date().toISOString().split('T')[0],
                tipo: 'saida',
                valor: custoTotal,
                descricao: `Uso de material: ${material.nome} x${qtd}`,
                origem: 'despesa',
                referencia_id: null,
                forma_pagamento_id: null
            }]);
        }
        await carregarMateriais();
        await carregarUsosMateriais();
        await carregarTransacoes();
        showAlert(`Uso registrado (custo: ${formatMoney(custoTotal)})`, 'success');
    } catch (e) { showAlert('Erro: ' + e.message, 'error'); }
};

// ==================== DASHBOARD E RELATÓRIOS ATUALIZADOS ====================
function atualizarDashboard() {
    const totalEntradas = currentData.transacoes.reduce((s, t) => s + (t.tipo === 'entrada' ? t.valor : 0), 0);
    const totalSaidas = currentData.transacoes.reduce((s, t) => s + (t.tipo === 'saida' ? t.valor : 0), 0);
    const saldo = totalEntradas - totalSaidas;
    document.getElementById('saldo-atual').innerText = formatMoney(saldo);
    document.getElementById('total-entradas').innerText = formatMoney(totalEntradas);
    document.getElementById('total-saidas').innerText = formatMoney(totalSaidas);
    document.getElementById('servicos-realizados').innerText = currentData.servicos.length;
    const repasseThalia = currentData.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (sv.valor_total || 0) * 0.7 : 0), 0);
    document.getElementById('repasse-thalia').innerText = formatMoney(repasseThalia);
    // Total de taxas pagas no mês atual
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    const taxasMes = currentData.transacoes.filter(t => {
        const dt = new Date(t.data);
        return dt.getMonth() === mes && dt.getFullYear() === ano && t.tipo === 'entrada' && t.forma_pagamento_id;
    }).reduce((sum, t) => {
        const forma = currentData.formasPagamento.find(fp => fp.id === t.forma_pagamento_id);
        if (!forma || forma.taxa === 0) return sum;
        // Estimativa: valor bruto = valor líquido / (1 - taxa/100)
        const valorBruto = t.valor / (1 - forma.taxa / 100);
        const taxaValor = valorBruto - t.valor;
        return sum + taxaValor;
    }, 0);
    document.getElementById('total-taxas-mes').innerText = formatMoney(taxasMes);
    // Gráficos
    if (chartFaturamento) chartFaturamento.destroy();
    const mesesLabels = [], valores = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        mesesLabels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
        const soma = currentData.transacoes.filter(t => {
            const dt = new Date(t.data);
            return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear() && t.tipo === 'entrada';
        }).reduce((s, t) => s + t.valor, 0);
        valores.push(soma);
    }
    const ctx = document.getElementById('chart-faturamento').getContext('2d');
    chartFaturamento = new Chart(ctx, { type: 'bar', data: { labels: mesesLabels, datasets: [{ label: 'Faturamento Líquido', data: valores, backgroundColor: '#818CF8' }] } });
    if (chartTipos) chartTipos.destroy();
    const tatuagens = currentData.servicos.filter(s => s.tipo === 'Tatuagem').length;
    const piercingsServ = currentData.servicos.filter(s => s.tipo === 'Piercing').length;
    chartTipos = new Chart(document.getElementById('chart-tipos').getContext('2d'), { type: 'doughnut', data: { labels: ['Tatuagens', 'Piercings'], datasets: [{ data: [tatuagens, piercingsServ], backgroundColor: ['#818CF8', '#C084FC'] }] } });
}

async function carregarRelatorios() {
    // Faturamento por tatuador (líquido)
    const fat = {};
    for (const s of currentData.servicos) {
        const pagamentos = await carregarPagamentosServico(s.id);
        const liquido = pagamentos.reduce((sum, p) => sum + p.valor_liquido, 0);
        fat[s.tatuador_nome] = (fat[s.tatuador_nome] || 0) + liquido;
    }
    document.getElementById('faturamento-tatuador').innerHTML = Object.entries(fat).map(([k, v]) => `<div><strong>${k}:</strong> ${formatMoney(v)}</div>`).join('') || 'Sem dados';
    const totalRepThalia = currentData.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (sv.valor_total || 0) * 0.7 : 0), 0);
    document.getElementById('relatorio-repasse').innerHTML = `<strong>Total bruto a repassar para Thalia:</strong> ${formatMoney(totalRepThalia)}`;
    const totalTaxas = currentData.transacoes.reduce((sum, t) => {
        if (t.tipo !== 'entrada' || !t.forma_pagamento_id) return sum;
        const forma = currentData.formasPagamento.find(fp => fp.id === t.forma_pagamento_id);
        if (!forma || forma.taxa === 0) return sum;
        const valorBruto = t.valor / (1 - forma.taxa / 100);
        return sum + (valorBruto - t.valor);
    }, 0);
    document.getElementById('relatorio-taxas').innerHTML = `<strong>Total de taxas pagas:</strong> ${formatMoney(totalTaxas)}`;
    const totalSaidas = currentData.transacoes.reduce((s, t) => s + (t.tipo === 'saida' ? t.valor : 0), 0);
    const lucroLiq = (currentData.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? sv.valor_total * 0.3 : sv.valor_total), 0)) - totalSaidas - totalTaxas;
    document.getElementById('relatorio-lucro-liquido').innerHTML = `<strong>Lucro Líquido do Estúdio:</strong> ${formatMoney(lucroLiq)}`;
}

// ==================== NAVEGAÇÃO E INICIALIZAÇÃO ====================
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
window.sincronizarAgora = () => location.reload();

async function carregarDadosSeccao(id) {
    if (id === 'dashboard' || id === 'caixa') await carregarTransacoes();
    if (id === 'dashboard' || id === 'servicos') await carregarServicos();
    if (id === 'dashboard' || id === 'agenda') await carregarAgenda();
    if (id === 'dashboard') atualizarDashboard();
    if (id === 'relatorios') await carregarRelatorios();
    if (id === 'piercing') { await carregarPiercings(); await carregarVendasPiercing(); }
    if (id === 'materiais') { await carregarMateriais(); await carregarUsosMateriais(); }
}

document.querySelectorAll('.nav button').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-section');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    carregarDadosSeccao(id);
}));

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) { showAlert('Supabase não disponível', 'error'); return; }
    const conectado = await testarConexao();
    if (!conectado) return;
    await carregarFormasPagamento();
    await carregarTransacoes();
    await carregarServicos();
    await carregarAgenda();
    atualizarDashboard();
    await carregarPiercings();
    await carregarVendasPiercing();
    await carregarMateriais();
    await carregarUsosMateriais();
    // Preencher selects de forma de pagamento nos modais
    const selectCaixa = document.getElementById('caixa-forma-pagamento');
    const selectVenda = document.getElementById('venda-forma-pagamento');
    if (selectCaixa) selectCaixa.innerHTML = '<option value="">Selecione</option>' + currentData.formasPagamento.map(fp => `<option value="${fp.id}">${fp.nome}</option>`).join('');
    if (selectVenda) selectVenda.innerHTML = '<option value="">Selecione</option>' + currentData.formasPagamento.map(fp => `<option value="${fp.id}">${fp.nome}</option>`).join('');
});

// ==================== DADOS DE EXEMPLO ====================
window.popularPiercingsExemplo = async () => { /* mantido igual */ };
window.popularMateriaisExemplo = async () => { /* mantido igual */ };