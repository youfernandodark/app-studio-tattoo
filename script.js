// ==================== RENDER SERVIÇOS (Fórmulas Corrigidas) ====================
function renderizarServicos(data) {
    let totalV = 0, totalE = 0, totalR = 0;
    const tbody = document.getElementById('servicos-tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum serviço encontrado</td></tr>';
        return;
    }

    data.forEach(s => {
        const val = parseFloat(s.valor_total) || 0;
        // ✅ CORRIGIDO: Adicionado operador de multiplicação (*)
        const estudio = s.tatuador_nome === 'Thalia' ? val * 0.3 : 0;
        const repasse = s.tatuador_nome === 'Thalia' ? val * 0.7 : val;
        
        totalV += val;
        totalE += estudio;
        totalR += repasse;
        
        const isFinalizado = s.finalizado === true;
        const acoes = isFinalizado
            ? '<span class="badge bg-success">✅ Finalizado</span>'
            : `<button class="btn btn-success btn-sm" onclick="finalizarServico('${s.id}')">✅ Finalizar</button> 
               <button class="btn btn-info btn-sm" onclick="remarcarServico('${s.id}')">📅 Remarcar</button> 
               <button class="btn btn-danger btn-sm" onclick="excluirServico('${s.id}')">Excluir</button>`;
        
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
                <td>${acoes}</td>
            </tr>`;
    });

    document.getElementById('servicos-total-valor').innerText = formatMoney(totalV);
    document.getElementById('servicos-total-estudio').innerText = formatMoney(totalE);
    document.getElementById('servicos-total-repasse').innerText = formatMoney(totalR);
}

// ==================== CÁLCULO DE REPASSE NO MODAL ====================
function configurarCalculoRepasse() {
    const valorInput = document.getElementById('servico-valor');
    const tatuadorSelect = document.getElementById('servico-tatuador');
    if (!valorInput || !tatuadorSelect) return;

    const calcular = () => {
        const val = parseFloat(valorInput.value) || 0;
        const tatuador = tatuadorSelect.value;
        const estudio = tatuador === 'Thalia' ? val * 0.3 : 0;
        const repasse = tatuador === 'Thalia' ? val * 0.7 : val;
        
        document.getElementById('valor-estudio').innerText = formatMoney(estudio);
        document.getElementById('valor-repasse').innerText = formatMoney(repasse);
    };

    valorInput.removeEventListener('input', calcular);
    tatuadorSelect.removeEventListener('change', calcular);
    valorInput.addEventListener('input', calcular);
    tatuadorSelect.addEventListener('change', calcular);
    calcular(); // Executa ao abrir o modal
}

// ==================== ATUALIZAR DASHBOARD (Cálculos) ====================
function atualizarDashboard() {
    const totalEnt = currentData.caixa.reduce((acc, i) => acc + (parseFloat(i.entradas) || 0), 0);
    const totalSai = currentData.caixa.reduce((acc, i) => acc + (parseFloat(i.saidas) || 0), 0);
    const saldo = currentData.caixa.length ? currentData.caixa[0].saldo_final : 0;

    document.getElementById('saldo-atual').innerText = formatMoney(saldo);
    document.getElementById('total-entradas').innerText = formatMoney(totalEnt);
    document.getElementById('total-saidas').innerText = formatMoney(totalSai);
    document.getElementById('servicos-realizados').innerText = currentData.servicos.filter(s => s.finalizado).length;

    // ✅ Repasse Thalia
    const repasseThalia = currentData.servicos.reduce((acc, sv) => 
        acc + (sv.tatuador_nome === 'Thalia' ? (parseFloat(sv.valor_total) || 0) * 0.7 : 0), 0);
    document.getElementById('repasse-thalia').innerText = formatMoney(repasseThalia);

    // ✅ Serviços Recentes & Próximos (lógica mantida, sintaxe limpa)
    const recentes = currentData.servicos.filter(s => !s.finalizado).slice(0, 5);
    document.getElementById('servicos-recentes').innerHTML = recentes.length 
        ? `<ul>${recentes.map(s => `<li>${formatDate(s.data)} - ${s.cliente}: ${formatMoney(s.valor_total)}</li>`).join('')}</ul>` 
        : 'Nenhum';
        
    const prox = currentData.agenda.filter(a => new Date(a.data_hora) >= new Date() && a.status !== 'Cancelado').slice(0, 5);
    document.getElementById('proximos-agendamentos').innerHTML = prox.length 
        ? `<ul>${prox.map(a => `<li>${formatDateTime(a.data_hora)} - ${a.cliente}</li>`).join('')}</ul>` 
        : 'Nenhum';

    // ... (Gráficos Chart.js mantidos, apenas limpe os espaços quebrados como `m eses` -> `meses`)
}

// ==================== RELATÓRIOS (Fórmulas de Lucro/Repasse) ====================
async function carregarRelatorios() {
    const fat = {};
    currentData.servicos.forEach(s => {
        fat[s.tatuador_nome] = (fat[s.tatuador_nome] || 0) + (parseFloat(s.valor_total) || 0);
    });
    document.getElementById('faturamento-tatuador').innerHTML = Object.entries(fat).map(([k, v]) => 
        `<div><strong>${k}:</strong> ${formatMoney(v)}</div>`).join('') || 'Sem dados';

    const totalRepThalia = currentData.servicos.reduce((acc, sv) => 
        acc + (sv.tatuador_nome === 'Thalia' ? (parseFloat(sv.valor_total) || 0) * 0.7 : 0), 0);
    document.getElementById('relatorio-repasse').innerHTML = `<strong>Total a repassar para Thalia:</strong> ${formatMoney(totalRepThalia)}`;

    const estudioThalia = currentData.servicos.reduce((acc, sv) => 
        acc + (sv.tatuador_nome === 'Thalia' ? (parseFloat(sv.valor_total) || 0) * 0.3 : 0), 0);
    const totalSaidas = currentData.caixa.reduce((acc, c) => acc + (parseFloat(c.saidas) || 0), 0);
    const lucroLiq = estudioThalia - totalSaidas;
    document.getElementById('relatorio-lucro-liquido').innerHTML = `<strong>Lucro Líquido (Estúdio):</strong> ${formatMoney(lucroLiq)}`;
}