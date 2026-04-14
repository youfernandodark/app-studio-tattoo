import { supabase } from '../supabaseClient.js';
import { formatMoney, formatDate, showAlert } from '../utils.js';
import { openModal, fecharModal } from '../ui.js';

export async function carregarPiercings() {
    const { data, error } = await supabase.from('piercings_estoque').select('*').order('nome');
    if (error) {
        showAlert('Erro ao carregar piercings', 'error');
        return;
    }
    renderizarEstoquePiercing(data);
}

export async function carregarVendasPiercing() {
    const { data, error } = await supabase
        .from('vendas_piercing')
        .select('*, piercing:piercings_estoque(nome)')
        .order('data', { ascending: false });
    if (error) {
        showAlert('Erro ao carregar vendas', 'error');
        return;
    }
    renderizarVendasPiercing(data);
}

function renderizarEstoquePiercing(piercings) {
    const tbody = document.getElementById('estoque-piercing-tbody');
    let html = '';
    piercings.forEach(p => {
        html += `
            <tr>
                <td>${p.nome}</td>
                <td>${p.quantidade}</td>
                <td>${formatMoney(p.preco_venda)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="window.editarPiercing(${p.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="window.excluirPiercing(${p.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html || '<tr><td colspan="4">Nenhum piercing cadastrado</td></tr>';

    // Atualizar select de venda
    let opts = '<option value="">Selecione um piercing</option>';
    piercings.forEach(p => {
        if (p.quantidade > 0) {
            opts += `<option value="${p.id}" data-preco="${p.preco_venda}">${p.nome} - ${formatMoney(p.preco_venda)} (estoque: ${p.quantidade})</option>`;
        }
    });
    const select = document.getElementById('venda-piercing-id');
    if (select) select.innerHTML = opts;
}

function renderizarVendasPiercing(vendas) {
    const tbody = document.getElementById('vendas-piercing-tbody');
    let html = '';
    vendas.forEach(v => {
        html += `
            <tr>
                <td>${formatDate(v.data)}</td>
                <td>${v.piercing?.nome || '?'}</td>
                <td>${v.quantidade}</td>
                <td>${formatMoney(v.valor_total)}</td>
                <td>${v.cliente || '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html || '<tr><td colspan="5">Nenhuma venda registrada</td></tr>';
}

export function abrirModalPiercing(id = null) {
    document.getElementById('piercing-id').value = '';
    document.getElementById('piercing-nome').value = '';
    document.getElementById('piercing-qtd').value = '';
    document.getElementById('piercing-preco').value = '';

    if (id) {
        supabase.from('piercings_estoque').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('piercing-id').value = data.id;
                document.getElementById('piercing-nome').value = data.nome;
                document.getElementById('piercing-qtd').value = data.quantidade;
                document.getElementById('piercing-preco').value = data.preco_venda;
                openModal('modal-piercing');
            }
        });
    } else {
        openModal('modal-piercing');
    }
}

export async function salvarPiercing() {
    const id = document.getElementById('piercing-id').value;
    const nome = document.getElementById('piercing-nome').value;
    const quantidade = parseInt(document.getElementById('piercing-qtd').value) || 0;
    const preco_venda = parseFloat(document.getElementById('piercing-preco').value) || 0;

    if (!nome) {
        showAlert('Nome do piercing é obrigatório', 'error');
        return;
    }

    let error;
    if (id) {
        const result = await supabase.from('piercings_estoque').update({ nome, quantidade, preco_venda }).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('piercings_estoque').insert([{ nome, quantidade, preco_venda }]);
        error = result.error;
    }

    if (error) {
        showAlert('Erro ao salvar piercing', 'error');
        return;
    }

    fecharModal('modal-piercing');
    await carregarPiercings();
    await carregarVendasPiercing();
    showAlert(id ? 'Piercing atualizado' : 'Piercing adicionado', 'success');
}

export async function excluirPiercing(id) {
    if (!confirm('Excluir este piercing permanentemente?')) return;
    const { error } = await supabase.from('piercings_estoque').delete().eq('id', id);
    if (error) {
        showAlert('Erro ao excluir piercing', 'error');
        return;
    }
    await carregarPiercings();
    await carregarVendasPiercing();
    showAlert('Piercing excluído', 'success');
}

export async function registrarVendaPiercing() {
    const piercingId = document.getElementById('venda-piercing-id').value;
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;

    if (!piercingId) {
        showAlert('Selecione um piercing', 'error');
        return;
    }
    if (!qtd || qtd < 1) {
        showAlert('Quantidade inválida', 'error');
        return;
    }

    const { data: piercing, error: fetchError } = await supabase
        .from('piercings_estoque')
        .select('*')
        .eq('id', piercingId)
        .single();

    if (fetchError || !piercing) {
        showAlert('Piercing não encontrado', 'error');
        return;
    }

    if (piercing.quantidade < qtd) {
        showAlert(`Estoque insuficiente. Disponível: ${piercing.quantidade}`, 'error');
        return;
    }

    const valorTotal = qtd * piercing.preco_venda;

    // Atualizar estoque
    const { error: updateError } = await supabase
        .from('piercings_estoque')
        .update({ quantidade: piercing.quantidade - qtd })
        .eq('id', piercingId);

    if (updateError) {
        showAlert('Erro ao atualizar estoque', 'error');
        return;
    }

    // Registrar venda
    const { error: insertError } = await supabase
        .from('vendas_piercing')
        .insert([{
            piercing_id: piercingId,
            quantidade: qtd,
            valor_total: valorTotal,
            cliente: cliente || null
        }]);

    if (insertError) {
        showAlert('Erro ao registrar venda', 'error');
        return;
    }

    // Recarregar dados
    await carregarPiercings();
    await carregarVendasPiercing();

    // Limpar campos
    document.getElementById('venda-qtd').value = '1';
    document.getElementById('venda-cliente').value = '';

    showAlert(`Venda registrada: ${formatMoney(valorTotal)}`, 'success');
}

// Funções auxiliares
export function editarPiercing(id) {
    abrirModalPiercing(id);
}
