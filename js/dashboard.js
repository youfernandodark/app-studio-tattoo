import app from './app.js';
import utils from './utils.js';

export const dashboard = {
    atualizar() {
        this.atualizarCards();
        this.atualizarUltimosServicos();
        this.atualizarEstoqueBaixo();
        this.atualizarProximosAgendamentos();
    },

    atualizarCards() {
        const dados = app.dados;
        
        // Calcular saldos
        const totalEntradas = dados.caixa.reduce((sum, item) => sum + (parseFloat(item.entradas) || 0), 0);
        const totalSaidas = dados.caixa.reduce((sum, item) => sum + (parseFloat(item.saidas) || 0), 0);
        const saldoAtual = totalEntradas - totalSaidas;
        
        // Calcular serviços
        const servicosRealizados = dados.servicos.length;
        const totalServicos = dados.servicos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
        const repasseThalia = totalServicos * 0.7;
        
        // Atualizar DOM
        document.getElementById('saldo-atual').textContent = utils.formatarMoeda(saldoAtual);
        document.getElementById('total-entradas').textContent = utils.formatarMoeda(totalEntradas);
        document.getElementById('total-saidas').textContent = utils.formatarMoeda(totalSaidas);
        document.getElementById('servicos-realizados').textContent = servicosRealizados;
        document.getElementById('repasse-thalia').textContent = utils.formatarMoeda(repasseThalia);
    },

    atualizarUltimosServicos() {
        const container = document.getElementById('ultimos-servicos');
        const servicos = app.dados.servicos.slice(-5).reverse();
        
        if (servicos.length === 0) {
            container.innerHTML = '<p class="loading">Nenhum serviço registrado</p>';
            return;
        }
        
        const html = servicos.map(s => `
            <div style="padding: 0.75rem; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${s.cliente}</strong>
                    <span style="color: var(--accent)">${utils.formatarMoeda(s.valor)}</span>
                </div>
                <small style="color: var(--text-secondary)">${utils.formatarData(s.data)} - ${s.tatuador}</small>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },

    atualizarEstoqueBaixo() {
        const container = document.getElementById('estoque-baixo');
        const piercingsBaixos = app.dados.piercings.filter(p => (p.estoque || 0) < 5);
        const materiaisBaixos = app.dados.materiais.filter(m => (m.estoque || 0) < 3);
        
        const itens = [...piercingsBaixos.map(p => ({...p, tipo: 'Piercing'})), 
                      ...materiaisBaixos.map(m => ({...m, tipo: 'Material'}))];
        
        if (itens.length === 0) {
            container.innerHTML = '<p style="color: var(--success); text-align: center;">✓ Todos os estoques OK</p>';
            return;
        }
        
        const html = itens.map(item => `
            <div style="padding: 0.75rem; border-bottom: 1px solid var(--border); color: var(--warning);">
                <strong>${item.nome || item.modelo}</strong> (${item.tipo})<br>
                <small>Estoque: ${item.estoque}</small>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },

    atualizarProximosAgendamentos() {
        const container = document.getElementById('proximos-agendamentos');
        const hoje = new Date().toISOString().split('T')[0];
        const agendamentos = app.dados.agenda
            .filter(a => a.data >= hoje && a.status !== 'Cancelado')
            .sort((a, b) => new Date(a.data + 'T' + a.horario) - new Date(b.data + 'T' + b.horario))
            .slice(0, 5);
        
        if (agendamentos.length === 0) {
            container.innerHTML = '<p class="loading">Nenhum agendamento próximo</p>';
            return;
        }
        
        const html = agendamentos.map(a => `
            <div style="padding: 0.75rem; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${a.cliente}</strong>
                    <span style="color: var(--accent)">${a.horario}</span>
                </div>
                <small style="color: var(--text-secondary)">${utils.formatarData(a.data)} - ${a.tatuador}</small>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
};

app.dashboard = dashboard;
export default dashboard;
