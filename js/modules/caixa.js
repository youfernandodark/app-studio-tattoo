import { supabase } from '../supabaseClient.js';
import { store } from '../store.js';
import { formatMoney, formatDate, showAlert } from '../utils.js';
import { openModal, fecharModal } from '../ui.js';
import { atualizarDashboard } from './dashboard.js';

export async function carregarCaixa() {
    const { data, error } = await supabase.from('caixa').select('*').order('data', { ascending: false });
    if (error) {
        showAlert('Erro ao carregar caixa', 'error');
        return;
    }
    store.caixa = data;
    renderizarCaixa(store.caixa);
}

export function renderizarCaixa(data) {
    const tbody = document.getElementById('caixa-tbody');
    let totalE = 0, totalS = 0;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum lançamento</td></tr>';
    } else {
        data.forEach(l => {
            const ent = Number(l.entradas) || 0;
            const sai = Number(l.saidas) || 0;
            totalE += ent;
            totalS += sai;
            tbody.innerHTML += `
                <tr>
                    <td>${formatDate(l.data)}</td>
                    <td>${formatMoney(l.saldo_inicial)}</td>
                    <td style="color:#34D399">+${formatMoney(ent)}</td>
                    <td style="color:#F87171">-${formatMoney(sai)}</td>
                    <td>${formatMoney(l.saldo_final)}</td>
                    <td>${l.descricao || '-'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="window.editarCaixa('${l.id}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="window.excluirCaixa('${l.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        });
    }
    document.getElementById('caixa-total-entradas').innerText = formatMoney(totalE);
    document.getElementById('caixa-total-saidas').innerText = formatMoney(totalS);
    document.getElementById('caixa-saldo-final').innerText = formatMoney(data[0]?.saldo_final || 0);
}

export function abrirModalCaixa() {
    document.getElementById('caixa-id').value = '';
    document.getElementById('caixa-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('caixa-saldo-inicial').value = '0';
    document.getElementById('caixa-entradas').value = '0';
    document.getElementById('caixa-saidas').value = '0';
    document.getElementById('caixa-descricao').value = '';
    openModal('modal-caixa');
}

export async function salvarCaixa() {
    const id = document.getElementById('caixa-id').value;
    const data = {
        data: document.getElementById('caixa-data').value,
        saldo_inicial: Number(document.getElementById('caixa-saldo-inicial').value) || 0,
        entradas: Number(document.getElementById('caixa-entradas').value) || 0,
        saidas: Number(document.getElementById('caixa-saidas').value) || 0,
        descricao: document.getElementById('caixa-descricao').value
    };
    data.saldo_final = data.saldo_inicial + data.entradas - data.saidas;
    
    let error;
    if (id) {
        const result = await supabase.from('caixa').update(data).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('caixa').insert([data]);
        error = result.error;
    }
    
    if (error) {
        showAlert('Erro ao salvar', 'error');
        return;
    }
    fecharModal('modal-caixa');
    document.getElementById('caixa-id').value = '';
    await carregarCaixa();
    atualizarDashboard();
    showAlert(id ? 'Lançamento atualizado' : 'Lançamento salvo', 'success');
}

export async function editarCaixa(id) {
    const item = store.caixa.find(c => c.id === id);
    if (!item) return;
    document.getElementById('caixa-id').value = item.id;
    document.getElementById('caixa-data').value = item.data;
    document.getElementById('caixa-saldo-inicial').value = item.saldo_inicial;
    document.getElementById('caixa-entradas').value = item.entradas;
    document.getElementById('caixa-saidas').value = item.saidas;
    document.getElementById('caixa-descricao').value = item.descricao || '';
    openModal('modal-caixa');
}

export async function excluirCaixa(id) {
    if (!confirm('Excluir este lançamento?')) return;
    const { error } = await supabase.from('caixa').delete().eq('id', id);
    if (error) {
        showAlert('Erro ao excluir', 'error');
        return;
    }
    await carregarCaixa();
    atualizarDashboard();
    showAlert('Lançamento excluído', 'success');
}

export function filtrarCaixa() {
    const search = document.getElementById('search-caixa').value.toLowerCase();
    const filtered = store.caixa.filter(i => (i.descricao || '').toLowerCase().includes(search));
    renderizarCaixa(filtered);
      }
