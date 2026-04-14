import app from './app.js';
import utils from './utils.js';

export const materiais = {
    carregar() {
        this.renderizarTabela();
        this.atualizarTotais();
    },

    renderizarTabela() {
        const tbody = document.getElementById('materiais-table-body');
        const dados = app.dados.materiais;
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum material cadastrado</td></tr>';
            return;
        }
        
        const html = dados.map(item => {
            const estoque = parseInt(item.estoque) || 0;
            const usado = parseInt(item.usado) || 0;
            const totalComprado = estoque + usado;
            const custo = parseFloat(item.custo) || 0;
            const valorEstoque = custo * estoque;
            
            return `
                <tr>
                    <td>${item.nome}</td>
                    <td>${estoque}</td>
                    <td>${usado}</td>
                    <td>${totalComprado}</td>
                    <td>${utils.formatarMoeda(custo)}</td>
                    <td><strong>${utils.formatarMoeda(valorEstoque)}</strong></td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="app.materiais.excluir('${item.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
    },

    atualizarTotais() {
        const dados = app.dados.materiais;
        const totalEstoque = dados.reduce((sum, m) => sum + (parseInt(m.estoque) || 0), 0);
        const totalUsado = dados.reduce((sum, m) => sum + (parseInt(m.usado) || 0), 0);
        const valorEstoque = dados.reduce((sum, m) => {
            return sum + ((parseFloat(m.custo) || 0) * (parseInt(m.estoque) || 0));
        }, 0);
        
        document.getElementById('materiais-total-estoque').textContent = totalEstoque;
        document.getElementById('materiais-total-usado').textContent = totalUsado;
        document.getElementById('materiais-valor-estoque').textContent = utils.formatarMoeda(valorEstoque);
    },

    calcularValor() {
        const estoque = parseInt(document.getElementById('material-estoque').value) || 0;
        const custo = parseFloat(document.getElementById('material-custo').value) || 0;
        const valorEstoque = custo * estoque;
        
        document.getElementById('material-valor-estoque').textContent = utils.formatarMoeda(valorEstoque);
    },

    salvar(event) {
        event.preventDefault();
        
        const material = {
            id: utils.gerarId(),
            nome: document.getElementById('material-nome').value,
            estoque: parseInt(document.getElementById('material-estoque').value) || 0,
            usado: parseInt(document.getElementById('material-usado').value) || 0,
            custo: parseFloat(document.getElementById('material-custo').value) || 0
        };
        
        app.dados.materiais.push(material);
        app.salvarDados();
        this.carregar();
        app.modals.close('modal-material');
        utils.mostrarMensagem('sucesso', 'Material cadastrado com sucesso!');
        
        event.target.reset();
    },

    excluir(id) {
        if (!utils.confirmarAcao('Deseja realmente excluir este material?')) return;
        
        app.dados.materiais = app.dados.materiais.filter(item => item.id !== id);
        app.salvarDados();
        this.carregar();
        utils.mostrarMensagem('sucesso', 'Material excluído!');
    }
};

app.materiais = materiais;
export default materiais;
