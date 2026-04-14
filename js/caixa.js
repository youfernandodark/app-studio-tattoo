import app from './app.js';
import utils from './utils.js';

export const caixa = {
    carregar() {
        this.renderizarTabela();
        this.atualizarTotais();
    },

    renderizarTabela() {
        const tbody = document.getElementById('caixa-table-body');
        const dados = app.dados.caixa.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum lançamento registrado</td></tr>';
            return;
        }
        
        let saldoAcumulado = 0;
        const html = dados.map(item => {
            const entradas = parseFloat(item.entradas) || 0;
            const saidas = parseFloat(item.saidas) || 0;
            const saldoInicial = saldoAcumulado;
            saldoAcumulado += (entradas - saidas);
            
            return `
                <tr>
                    <td>${utils.formatarData(item.data)}</td>
                    <td>${utils.formatarMoeda(saldoInicial)}</td>
                    <td style="color: var(--success)">${utils.formatarMoeda(entradas)}</td>
                    <td style="color: var(--danger)">${utils.formatarMoeda(saidas)}</td>
                    <td><strong>${utils.formatarMoeda(saldoAcumulado)}</strong></td>
                    <td>${item.descricao || '-'}</td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="app.caixa.excluir('${item.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
    },

    atualizarTotais() {
        const dados = app.dados.caixa;
        const totalEntradas = dados.reduce((sum, item) => sum + (parseFloat(item.entradas) || 0), 0);
        const totalSaidas = dados.reduce((sum, item) => sum + (parseFloat(item.saidas) || 0), 0);
        const saldoInicial = 0;
        
        document.getElementById('caixa-saldo-inicial').textContent = utils.formatarMoeda(saldoInicial);
        document.getElementById('caixa-entradas').textContent = utils.formatarMoeda(totalEntradas);
        document.getElementById('caixa-saidas').textContent = utils.formatarMoeda(totalSaidas);
    },

    salvar(event) {
        event.preventDefault();
        
        const lancamento = {
            id: utils.gerarId(),
            data: document.getElementById('lancamento-data').value,
            saldoInicial: parseFloat(document.getElementById('lancamento-saldo-inicial').value) || 0,
            entradas: parseFloat(document.getElementById('lancamento-entradas').value) || 0,
            saidas: parseFloat(document.getElementById('lancamento-saidas').value) || 0,
            descricao: document.getElementById('lancamento-descricao').value
        };
        
        app.dados.caixa.push(lancamento);
        app.salvarDados();
        this.carregar();
        app.modals.close('modal-lancamento');
        utils.mostrarMensagem('sucesso', 'Lançamento salvo com sucesso!');
        
        event.target.reset();
    },

    excluir(id) {
        if (!utils.confirmarAcao('Deseja realmente excluir este lançamento?')) return;
        
        app.dados.caixa = app.dados.caixa.filter(item => item.id !== id);
        app.salvarDados();
        this.carregar();
        utils.mostrarMensagem('sucesso', 'Lançamento excluído!');
    }
};

app.caixa = caixa;
export default caixa;
