import app from './app.js';
import utils from './utils.js';

export const agenda = {
    carregar() {
        this.renderizarTabela();
    },

    renderizarTabela(agendamentos = app.dados.agenda) {
        const tbody = document.getElementById('agenda-table-body');
        const dados = agendamentos.sort((a, b) => {
            const dateA = new Date(a.data + 'T' + a.horario);
            const dateB = new Date(b.data + 'T' + b.horario);
            return dateA - dateB;
        });
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Nenhum agendamento registrado</td></tr>';
            return;
        }
        
        const html = dados.map(item => {
            const statusColor = item.status === 'Concluído' ? 'var(--success)' : 
                               item.status === 'Cancelado' ? 'var(--danger)' : 
                               item.status === 'Confirmado' ? 'var(--accent)' : 'var(--warning)';
            
            return `
                <tr>
                    <td>${utils.formatarData(item.data)} ${item.horario}</td>
                    <td>${item.cliente}</td>
                    <td>${item.tatuador}</td>
                    <td>${item.tipo}</td>
                    <td>${utils.formatarMoeda(item.valor)}</td>
                    <td style="color: ${statusColor}"><strong>${item.status}</strong></td>
                    <td>${item.observacoes || '-'}</td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="app.agenda.excluir('${item.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
    },

    filtrarHoje() {
        const hoje = new Date().toISOString().split('T')[0];
        const filtrados = app.dados.agenda.filter(a => a.data === hoje);
        this.renderizarTabela(filtrados);
    },

    limparFiltros() {
        document.getElementById('agenda-filtro-tatuador').value = '';
        document.getElementById('agenda-filtro-status').value = '';
        this.carregar();
    },

    salvar(event) {
        event.preventDefault();
        
        const agendamento = {
            id: utils.gerarId(),
            data: document.getElementById('agendamento-data').value,
            horario: document.getElementById('agendamento-horario').value,
            cliente: document.getElementById('agendamento-cliente').value,
            tatuador: document.getElementById('agendamento-tatuador').value,
            tipo: document.getElementById('agendamento-tipo').value,
            valor: parseFloat(document.getElementById('agendamento-valor').value) || 0,
            status: document.getElementById('agendamento-status').value,
            observacoes: document.getElementById('agendamento-observacoes').value
        };
        
        app.dados.agenda.push(agendamento);
        app.salvarDados();
        this.carregar();
        app.modals.close('modal-agendamento');
        utils.mostrarMensagem('sucesso', 'Agendamento registrado com sucesso!');
        
        event.target.reset();
    },

    excluir(id) {
        if (!utils.confirmarAcao('Deseja realmente excluir este agendamento?')) return;
        
        app.dados.agenda = app.dados.agenda.filter(item => item.id !== id);
        app.salvarDados();
        this.carregar();
        utils.mostrarMensagem('sucesso', 'Agendamento excluído!');
    }
};

app.agenda = agenda;
export default agenda;
