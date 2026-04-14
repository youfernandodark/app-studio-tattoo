import app from './app.js';
import utils from './utils.js';

export const piercings = {
    carregar() {
        this.renderizarTabela();
        this.atualizarTotais();
    },

    renderizarTabela(piercings = app.dados.piercings) {
        const tbody = document.getElementById('piercings-table-body');
        const dados = piercings;
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">Nenhum piercing cadastrado</td></tr>';
            return;
        }
        
        const html = dados.map(item => {
            const estoque = parseInt(item.estoque) || 0;
            const vendido = parseInt(item.vendido) || 0;
            const totalComprado = estoque + vendido;
            const custo = parseFloat(item.custo) || 0;
            const preco = parseFloat(item.preco) || 0;
            const lucroUnit = preco - custo;
            const lucroTotal = lucroUnit * vendido;
            
            return `
                <tr>
                    <td>${item.modelo}</td>
                    <td>${estoque}</td>
                    <td>${vendido}</td>
                    <td>${totalComprado}</td>
                    <td>${utils.formatarMoeda(custo)}</td>
                    <td>${utils.formatarMoeda(preco)}</td>
                    <td style="color: ${lucroUnit >= 0 ? 'var(--success)' : 'var(--danger)'}">${utils.formatarMoeda(lucroUnit)}</td>
                    <td><strong>${utils.formatarMoeda(lucroTotal)}</strong></td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="app.piercings.excluir('${item.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
    },

    atualizarTotais() {
        const dados = app.dados.piercings;
        const totalEstoque = dados.reduce((sum, p) => sum + (parseInt(p.estoque) || 0), 0);
        const totalVendido = dados.reduce((sum, p) => sum + (parseInt(p.vendido) || 0), 0);
        const totalLucro = dados.reduce((sum, p) => {
            const lucroUnit = (parseFloat(p.preco) || 0) - (parseFloat(p.custo) || 0);
            return sum + (lucroUnit * (parseInt(p.vendido) || 0));
        }, 0);
        
        document.getElementById('piercings-total-estoque').textContent = totalEstoque;
        document.getElementById('piercings-total-vendido').textContent = totalVendido;
        document.getElementById('piercings-total-lucro').textContent = utils.formatarMoeda(totalLucro);
    },

    filtrar(tipo) {
        let filtrados = [...app.dados.piercings];
        
        if (tipo === 'estoque') {
            filtrados = filtrados.filter(p => (p.estoque || 0) > 0);
        } else if (tipo === 'sem-estoque') {
            filtrados = filtrados.filter(p => (p.estoque || 0) === 0);
        }
        
        this.renderizarTabela(filtrados);
    },

    calcularLucro() {
        const estoque = parseInt(document.getElementById('piercing-estoque').value) || 0;
        const vendido = parseInt(document.getElementById('piercing-vendido').value) || 0;
        const custo = parseFloat(document.getElementById('piercing-custo').value) || 0;
        const preco = parseFloat(document.getElementById('piercing-preco').value) || 0;
        
        const lucroUnit = preco - custo;
        const lucroTotal = lucroUnit * vendido;
        
        document.getElementById('piercing-lucro-unit').textContent = utils.formatarMoeda(lucroUnit);
        document.getElementById('piercing-lucro-total').textContent = utils.formatarMoeda(lucroTotal);
    },

    salvar(event) {
        event.preventDefault();
        
        const piercing = {
            id: utils.gerarId(),
            modelo: document.getElementById('piercing-modelo').value,
            estoque: parseInt(document.getElementById('piercing-estoque').value) || 0,
            vendido: parseInt(document.getElementById('piercing-vendido').value) || 0,
            custo: parseFloat(document.getElementById('piercing-custo').value) || 0,
            preco: parseFloat(document.getElementById('piercing-preco').value) || 0
        };
        
        app.dados.piercings.push(piercing);
        app.salvarDados();
        this.carregar();
        app.modals.close('modal-piercing');
        utils.mostrarMensagem('sucesso', 'Piercing cadastrado com sucesso!');
        
        event.target.reset();
    },

    excluir(id) {
        if (!utils.confirmarAcao('Deseja realmente excluir este piercing?')) return;
        
        app.dados.piercings = app.dados.piercings.filter(item => item.id !== id);
        app.salvarDados();
        this.carregar();
        utils.mostrarMensagem('sucesso', 'Piercing excluído!');
    }
};

app.piercings = piercings;
export default piercings;
