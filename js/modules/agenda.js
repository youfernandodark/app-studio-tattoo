import { supabase } from '../supabaseClient.js';
import { store } from '../store.js';
import { formatMoney, formatDateTime, showAlert } from '../utils.js';
import { openModal, fecharModal } from '../ui.js';
import { atualizarDashboard } from './dashboard.js';

export async function carregarAgenda() {
    const { data, error } = await supabase.from('agenda').select('*').order('data_hora', { ascending: true });
    if (error) {
        showAlert('Erro ao carregar agenda', 'error');
        return;
    }
    store.agenda = data;
    renderizarAgenda(store.agenda);
}

export function renderizarAgenda(data) {
    const tbody = document.getElementById('agenda-tbody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">Nenhum agendamento</td></tr>';
        return;
    }
    data.forEach(a => {
        let statusClass = '';
        if (a.status === 'Agendado') statusClass = 'status-warning';
        else if (a.status === 'Confirmado') statusClass = 'status-info';
        else if (a.status === 'Concluído') statusClass = 'status-success';
        else if (a.status === 'Cancelado') statusClass = 'status-danger';
        
        const confirmBtn = (a.status === 'Agendado') 
            ? `<button class="btn btn-success btn-sm" onclick="window.confirmarAgendamento('${a.id}')"><i class="fas fa-check"></i> Confirmar</button> `
            : '';
        
        tbody.innerHTML += `
            <tr>
                <td>${formatDateTime(a.data_hora)}</td>
                <td>${a.cliente}</td>
                <td>${a.tatuador_nome}</td>
                <td>${a.tipo_servico}</td>
                <td>${formatMoney(a.valor_estimado)}</td>
                <td><span class="status-badge-item ${statusClass}">${a.status}</span></td>
                <td>${a.observacoes || '-'}</td>
                <td>
                    ${confirmBtn}
                    <button class="btn btn-warning btn-sm" onclick="window.editarAgenda('${a.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="window.excluirAgenda('${a.id}')">Excluir</button>
                </td>
            </tr>
        `;
    });
}

export function abrirModalAgendamento() {
    document.getElementById('agenda-id').value = '';
    document.getElementById('agenda-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('agenda-horario').value = '10:00';
    document.getElementById('agenda-cliente').value = '';
    document.getElementById('agenda-tatuador').value = 'Fernando Dark';
    document.getElementById('agenda-tipo').value = 'Tatuagem';
    document.getElementById('agenda-valor').value = '0';
    document.getElementById('agenda-status').value = 'Agendado';
    document.getElementById('agenda-obs').value = '';
    openModal('modal-agenda');
}

export async function salvarAgenda() {
    const id = document.getElementById('agenda-id').value;
    const dataHora = `${document.getElementById('agenda-data').value} ${document.getElementById('agenda-horario').value}`;
    const data = {
        data_hora: dataHora,
        cliente: document.getElementById('agenda-cliente').value,
        tatuador_nome: document.getElementById('agenda-tatuador').value,
        tipo_servico: document.getElementById('agenda-tipo').value,
        valor_estimado: Number(document.getElementById('agenda-valor').value) || 0,
        status: document.getElementById('agenda-status').value,
        observacoes: document.getElementById('agenda-obs').value
    };
    
    let error;
    if (id) {
        const result = await supabase.from('agenda').update(data).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('agenda').insert([data]);
        error = result.error;
    }
    
    if (error) {
        showAlert('Erro ao salvar agendamento', 'error');
        return;
    }
    fecharModal('modal-agenda');
    await carregarAgenda();
    atualizarDashboard();
    showAlert(id ? 'Agendamento atualizado' : 'Agendamento salvo', 'success');
}

export async function editarAgenda(id) {
    const item = store.agenda.find(a => a.id === id);
    if (!item) return;
    const dt = new Date(item.data_hora);
    document.getElementById('agenda-id').value = item.id;
    document.getElementById('agenda-data').value = dt.toISOString().split('T')[0];
    document.getElementById('agenda-horario').value = dt.toTimeString().slice(0,5);
    document.getElementById('agenda-cliente').value = item.cliente;
    document.getElementById('agenda-tatuador').value = item.tatuador_nome;
    document.getElementById('agenda-tipo').value = item.tipo_servico;
    document.getElementById('agenda-valor').value = item.valor_estimado;
    document.getElementById('agenda-status').value = item.status;
    document.getElementById('agenda-obs').value = item.observacoes || '';
    openModal('modal-agenda');
}

export async function excluirAgenda(id) {
    if (!confirm('Excluir este agendamento?')) return;
    const { error } = await supabase.from('agenda').delete().eq('id', id);
    if (error) {
        showAlert('Erro ao excluir', 'error');
        return;
    }
    await carregarAgenda();
    atualizarDashboard();
    showAlert('Agendamento excluído', 'success');
}

export async function confirmarAgendamento(id) {
    if (!confirm('Confirmar este agendamento?')) return;
    const { error } = await supabase.from('agenda').update({ status: 'Confirmado' }).eq('id', id);
    if (error) {
        showAlert('Erro ao confirmar', 'error');
        return;
    }
    await carregarAgenda();
    atualizarDashboard();
    showAlert('Status alterado para Confirmado', 'success');
}

// Filtros
export function filtrarAgenda() {
    let filtered = [...store.agenda];
    const tat = document.getElementById('filtro-tatuador-agenda').value;
    if (tat) filtered = filtered.filter(a => a.tatuador_nome === tat);
    const stat = document.getElementById('filtro-status-agenda').value;
    if (stat) filtered = filtered.filter(a => a.status === stat);
    const data = document.getElementById('filtro-data-agenda').value;
    if (data) filtered = filtered.filter(a => new Date(a.data_hora).toISOString().split('T')[0] === data);
    renderizarAgenda(filtered);
}

export function limparFiltrosAgenda() {
    document.getElementById('filtro-tatuador-agenda').value = '';
    document.getElementById('filtro-status-agenda').value = '';
    document.getElementById('filtro-data-agenda').value = '';
    renderizarAgenda(store.agenda);
}

export function filtrarAgendaHoje() {
    document.getElementById('filtro-data-agenda').valueAsDate = new Date();
    filtrarAgenda();
}
