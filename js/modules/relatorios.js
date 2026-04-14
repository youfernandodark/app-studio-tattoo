import { store } from '../store.js';
import { formatMoney } from '../utils.js';

export function carregarRelatorios() {
    // Faturamento por tatuador
    const fat = {};
    store.servicos.forEach(s => {
        const nome = s.tatuador_nome;
        fat[nome] = (fat[nome] || 0) + (Number(s.valor_total) || 0);
    });
    const fatDiv = document.getElementById('faturamento-tatuador');
    if (fatDiv) {
        fatDiv.innerHTML = Object.entries(fat).length
            ? Object.entries(fat).map(([k, v]) => `<div><strong>${k}:</strong> ${formatMoney(v)}</div>`).join('')
            : 'Sem dados';
    }

    // Repasse total para Thalia (70% dos serviços dela)
    const totalRepThalia = store.servicos.reduce((acc, s) => {
        return acc + (s.tatuador_nome === 'Thalia' ? (Number(s.valor_total) || 0) * 0.7 : 0);
    }, 0);
    const repasseDiv = document.getElementById('relatorio-repasse');
    if (repasseDiv) {
        repasseDiv.innerHTML = `<strong>Total a repassar para Thalia:</strong> ${formatMoney(totalRepThalia)}`;
    }

    // Lucro líquido do estúdio: 30% dos serviços da Thalia - despesas totais (saídas do caixa)
    const estudioThalia = store.servicos.reduce((acc, s) => {
        return acc + (s.tatuador_nome === 'Thalia' ? (Number(s.valor_total) || 0) * 0.3 : 0);
    }, 0);
    const totalSaidas = store.caixa.reduce((acc, c) => acc + (Number(c.saidas) || 0), 0);
    const lucroLiq = estudioThalia - totalSaidas;
    const lucroDiv = document.getElementById('relatorio-lucro-liquido');
    if (lucroDiv) {
        lucroDiv.innerHTML = `<strong>Lucro Líquido (Estúdio):</strong> ${formatMoney(lucroLiq)}<br>
        <small>(30% dos serviços de Thalia - despesas totais)</small>`;
    }
}
