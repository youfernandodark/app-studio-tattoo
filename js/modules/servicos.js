import { supabase } from '../supabaseClient.js';
import { store } from '../store.js';
import { formatMoney, formatDate, showAlert } from '../utils.js';
import { openModal, fecharModal } from '../ui.js';
import { atualizarDashboard } from './dashboard.js';

export async function carregarServicos() {
    const { data, error } = await supabase.from('servicos').select('*').order('data', { ascending: false });
    if (error) {
        showAlert('Erro ao carregar serviços', 'error');
        return;
    }
    store.servicos = data;
    renderizarServicos(store.servicos);
}

export function renderizarServicos(data) {
    const tbody = document.getElementById('servicos-tbody');
    let totalV = 0, totalE = 0, totalR = 0;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Nenhum serviço</td></tr>';
    } else {
        data.forEach(s => {
            const val = Number(s.valor_total) || 0;
            const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : 0;
            const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : val;
            totalV += val;
            totalE += estudio;
            totalR += repasse;
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
                    <td>${s.forma_pagamento}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="window.editarServico('${s.id}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="window.excluirServico('${s.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        });
    }
    document.getElementById('servicos-total-valor').innerText = formatMoney(totalV);
    document.getElementById('servicos-total-estudio').innerText = formatMoney(totalE);
    document.getElementById('servicos-total-repasse').innerText = formatMoney(totalR);
}

export function abrirModalServico() {
    document.getElementById('servico-id').value = '';
    document.getElementById('servico-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('servico-cliente').value = '';
    document.getElementById('servico-descricao').value = '';
    document.getElementById('servico-valor').value = '';
    document.getElementById('servico-tatuador').value = 'Fernando Dark';
    document.getElementById('servico-tipo').value = 'Tatuagem';
    document.getElementById('servico-pagamento').value = 'PIX';
    calcularRepasse();
    openModal('modal-servico');
}

export function calcularRepasse() {
    const val = Number(document.getElementById('servico-valor').value) || 0;
    const tatuador = document.getElementById('servico-tatuador').value;
    const estudio = tatuador === 'Thalia' ? val * 0.3 : 0;
    const repasse = tatuador === 'Thalia' ? val * 0.7 : val;
    document.getElementById('valor-estudio').innerText = formatMoney(estudio);
    document.getElementById('valor-repasse').innerText = formatMoney(repasse);
}

export async function salvarServico() {
    const id = document.getElementById('servico-id').value;
    const data = {
        data: document.getElementById('servico-data').value,
        cliente: document.getElementById('servico-cliente').value,
        tatuador_nome: document.getElementById('servico-tatuador').value,
        tipo: document.getElementById('servico-tipo').value,
        descricao: document.getElementById('servico-descricao').value,
        valor_total: Number(document.getElementById('servico-valor').value) || 0,
        forma_pagamento: document.getElementById('servico-pagamento').value
    };
    
    let error;
    if (id) {
        const result = await supabase.from('servicos').update(data).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('servicos').insert([data]);
        error = result.error;
    }
    
    if (error) {
        showAlert('Erro ao salvar serviço', 'error');
        return;
    }
    fecharModal('modal-servico');
    await carregarServicos();
    atualizarDashboard();
    showAlert(id ? 'Serviço atualizado' : 'Serviço salvo', 'success');
}

export async function editarServico(id) {
    const item = store.servicos.find(s => s.id === id);
    if (!item) return;
    document.getElementById('servico-id').value = item.id;
    document.getElementById('servico-data').value = item.data;
    document.getElementById('servico-cliente').value = item.cliente;
    document.getElementById('servico-tatuador').value = item.tatuador_nome;
    document.getElementById('servico-tipo').value = item.tipo;
    document.getElementById('servico-descricao').value = item.descricao || '';
    document.getElementById('servico-valor').value = item.valor_total;
    document.getElementById('servico-pagamento').value = item.forma_pagamento;
    calcularRepasse();
    openModal('modal-servico');
}

export async function excluirServico(id) {
    if (!confirm('Excluir este serviço?')) return;
    const { error } = await supabase.from('servicos').delete().eq('id', id);
    if (error) {
        showAlert('Erro ao excluir', 'error');
        return;
    }
    await carregarServicos();
    atualizarDashboard();
    showAlert('Serviço excluído', 'success');
}

// Filtros
export function filtrarServicos() {
    let filtered = [...store.servicos];
    const tat = document.getElementById('filtro-tatuador-servico').value;
    if (tat) filtered = filtered.filter(s => s.tatuador_nome === tat);
    const tipo = document.getElementById('filtro-tipo-servico').value;
    if (tipo) filtered = filtered.filter(s => s.tipo === tipo);
    const pg = document.getElementById('filtro-pagamento').value;
    if (pg) filtered = filtered.filter(s => s.forma_pagamento === pg);
    const dt = document.getElementById('filtro-data-servico').value;
    if (dt) filtered = filtered.filter(s => s.data === dt);
    const search = document.getElementById('search-servicos').value.toLowerCase();
    if (search) filtered = filtered.filter(s => s.cliente.toLowerCase().includes(search) || (s.descricao || '').toLowerCase().includes(search));
    renderizarServicos(filtered);
}

export function limparFiltrosServicos() {
    document.getElementById('filtro-tatuador-servico').value = '';
    document.getElementById('filtro-tipo-servico').value = '';
    document.getElementById('filtro-pagamento').value = '';
    document.getElementById('filtro-data-servico').value = '';
    document.getElementById('search-servicos').value = '';
    renderizarServicos(store.servicos);
}
