import { supabase } from '../supabaseClient.js';
import { formatMoney, formatDate, showAlert } from '../utils.js';
import { openModal, fecharModal } from '../ui.js';

export async function carregarMateriais() {
    const { data, error } = await supabase.from('materiais_estoque').select('*').order('nome');
    if (error) {
        showAlert('Erro ao carregar materiais', 'error');
        return;
    }
    renderizarEstoqueMaterial(data);
}

export async function carregarUsosMateriais() {
    const { data, error } = await supabase
        .from('usos_materiais')
        .select('*, material:materiais_estoque(nome)')
        .order('data', { ascending: false });
    if (error) {
        showAlert('Erro ao carregar usos', 'error');
        return;
    }
    renderizarUsosMateriais(data);
}

function renderizarEstoqueMaterial(materiais) {
    const tbody = document.getElementById('estoque-material-tbody');
    let html = '';
    materiais.forEach(m => {
        html += `
            <tr>
                <td>${m.nome}</td>
                <td>${m.quantidade}</td>
                <td>${formatMoney(m.valor_unitario)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="window.editarMaterial(${m.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="window.excluirMaterial(${m.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html || '<tr><td colspan="4">Nenhum material cadastrado</td></tr>';

    // Atualizar select de uso
    let opts = '<option value="">Selecione um material</option>';
    materiais.forEach(m => {
        if (m.quantidade > 0) {
            opts += `<option value="${m.id}">${m.nome} (${m.quantidade} un.)</option>`;
        }
    });
    const select = document.getElementById('uso-material-id');
    if (select) select.innerHTML = opts;
}

function renderizarUsosMateriais(usos) {
    const tbody = document.getElementById('usos-materiais-tbody');
    let html = '';
    usos.forEach(u => {
        html += `
            <tr>
                <td>${formatDate(u.data)}</td>
                <td>${u.material?.nome || '?'}</td>
                <td>${u.quantidade}</td>
                <td>${u.observacao || '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html || '<tr><td colspan="4">Nenhum uso registrado</td></tr>';
}

export function abrirModalMaterial(id = null) {
    document.getElementById('material-id').value = '';
    document.getElementById('material-nome').value = '';
    document.getElementById('material-qtd').value = '';
    document.getElementById('material-preco').value = '';

    if (id) {
        supabase.from('materiais_estoque').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('material-id').value = data.id;
                document.getElementById('material-nome').value = data.nome;
                document.getElementById('material-qtd').value = data.quantidade;
                document.getElementById('material-preco').value = data.valor_unitario;
                openModal('modal-material');
            }
        });
    } else {
        openModal('modal-material');
    }
}

export async function salvarMaterial() {
    const id = document.getElementById('material-id').value;
    const nome = document.getElementById('material-nome').value;
    const quantidade = parseInt(document.getElementById('material-qtd').value) || 0;
    const valor_unitario = parseFloat(document.getElementById('material-preco').value) || 0;

    if (!nome) {
        showAlert('Nome do material é obrigatório', 'error');
        return;
    }

    let error;
    if (id) {
        const result = await supabase.from('materiais_estoque').update({ nome, quantidade, valor_unitario }).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('materiais_estoque').insert([{ nome, quantidade, valor_unitario }]);
        error = result.error;
    }

    if (error) {
        showAlert('Erro ao salvar material', 'error');
        return;
    }

    fecharModal('modal-material');
    await carregarMateriais();
    await carregarUsosMateriais();
    showAlert(id ? 'Material atualizado' : 'Material adicionado', 'success');
}

export async function excluirMaterial(id) {
    if (!confirm('Excluir este material permanentemente?')) return;
    const { error } = await supabase.from('materiais_estoque').delete().eq('id', id);
    if (error) {
        showAlert('Erro ao excluir material', 'error');
        return;
    }
    await carregarMateriais();
    await carregarUsosMateriais();
    showAlert('Material excluído', 'success');
}

export async function registrarUsoMaterial() {
    const materialId = document.getElementById('uso-material-id').value;
    const qtd = parseInt(document.getElementById('uso-qtd').value);
    const observacao = document.getElementById('uso-obs').value;

    if (!materialId) {
        showAlert('Selecione um material', 'error');
        return;
    }
    if (!qtd || qtd < 1) {
        showAlert('Quantidade inválida', 'error');
        return;
    }

    const { data: material, error: fetchError } = await supabase
        .from('materiais_estoque')
        .select('*')
        .eq('id', materialId)
        .single();

    if (fetchError || !material) {
        showAlert('Material não encontrado', 'error');
        return;
    }

    if (material.quantidade < qtd) {
        showAlert(`Estoque insuficiente. Disponível: ${material.quantidade}`, 'error');
        return;
    }

    // Atualizar estoque
    const { error: updateError } = await supabase
        .from('materiais_estoque')
        .update({ quantidade: material.quantidade - qtd })
        .eq('id', materialId);

    if (updateError) {
        showAlert('Erro ao atualizar estoque', 'error');
        return;
    }

    // Registrar uso
    const { error: insertError } = await supabase
        .from('usos_materiais')
        .insert([{
            material_id: materialId,
            quantidade: qtd,
            observacao: observacao || null
        }]);

    if (insertError) {
        showAlert('Erro ao registrar uso', 'error');
        return;
    }

    await carregarMateriais();
    await carregarUsosMateriais();

    document.getElementById('uso-qtd').value = '1';
    document.getElementById('uso-obs').value = '';

    showAlert(`Uso de ${qtd} unidade(s) de ${material.nome} registrado`, 'success');
}

export function editarMaterial(id) {
    abrirModalMaterial(id);
}
