import { store } from '../store.js';
import { formatMoney, formatDate, formatDateTime } from '../utils.js';

let chartFaturamento = null;
let chartTipos = null;

export function atualizarDashboard() {
    const totalEnt = store.caixa.reduce((s, i) => s + (Number(i.entradas) || 0), 0);
    const totalSai = store.caixa.reduce((s, i) => s + (Number(i.saidas) || 0), 0);
    const saldo = store.caixa[0]?.saldo_final || 0;
    
    document.getElementById('saldo-atual').innerText = formatMoney(saldo);
    document.getElementById('total-entradas').innerText = formatMoney(totalEnt);
    document.getElementById('total-saidas').innerText = formatMoney(totalSai);
    document.getElementById('servicos-realizados').innerText = store.servicos.length;
    
    const repasseThalia = store.servicos.reduce((s, sv) => s + (sv.tatuador_nome === 'Thalia' ? (Number(sv.valor_total) || 0) * 0.7 : 0), 0);
    document.getElementById('repasse-thalia').innerText = formatMoney(repasseThalia);
    
    // Últimos serviços
    const recentes = store.servicos.slice(0, 5);
    document.getElementById('servicos-recentes').innerHTML = recentes.length 
        ? `<ul>${recentes.map(s => `<li>${formatDate(s.data)} - ${s.cliente}: ${formatMoney(s.valor_total)}</li>`).join('')}</ul>` 
        : 'Nenhum serviço registrado';
    
    // Próximos agendamentos
    const prox = store.agenda
        .filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'Cancelado')
        .slice(0, 5);
    document.getElementById('proximos-agendamentos').innerHTML = prox.length 
        ? `<ul>${prox.map(a => `<li>${formatDateTime(a.data_hora)} - ${a.cliente}</li>`).join('')}</ul>` 
        : 'Nenhum agendamento futuro';
    
    // Gráfico de faturamento mensal (últimos 6 meses)
    if (chartFaturamento) chartFaturamento.destroy();
    const meses = [];
    const valores = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
        const soma = store.servicos.filter(s => {
            const data = new Date(s.data);
            return data.getMonth() === d.getMonth() && data.getFullYear() === d.getFullYear();
        }).reduce((s, sv) => s + (Number(sv.valor_total) || 0), 0);
        valores.push(soma);
    }
    const ctx = document.getElementById('chart-faturamento').getContext('2d');
    chartFaturamento = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{ label: 'Faturamento (R$)', data: valores, backgroundColor: '#818CF8' }]
        }
    });
    
    // Gráfico de distribuição por tipo
    if (chartTipos) chartTipos.destroy();
    const tatuagens = store.servicos.filter(s => s.tipo === 'Tatuagem').length;
    const piercingsServ = store.servicos.filter(s => s.tipo === 'Piercing').length;
    chartTipos = new Chart(document.getElementById('chart-tipos').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Tatuagens', 'Piercings'],
            datasets: [{ data: [tatuagens, piercingsServ], backgroundColor: ['#818CF8', '#C084FC'] }]
        }
    });
}
