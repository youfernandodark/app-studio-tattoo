import app from './app.js';
import utils from './utils.js';

export const servicos = {
    carregar() {
        this.renderizarTabela();
        this.aplicarFiltros();
    },

    renderizarTabela(servicos = app.dados.servicos) {
        const tbody = document.getElementById('servicos-table-body');
        const dados = servicos.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading">Nenhum serviço registrado</td></tr>';
            return;
        }
        
        const html = dados.map(item => {
            const valor = parseFloat(item.valor) || 0;
            const estudio = valor * 0.3;
            const repasse = valor * 0.7;
            
            return `
                <tr>
                    <td>${utils.formatarDataHora(item.data)}</td>
                    <td>${item.cliente}</td>
                    <td>${item.tatuador}</td>
                    <td>${item.tipo}</td>
                    <td>${item.descricao || '-'}</td>
                    <td><strong>${utils.formatarMoeda(valor)}</strong></td>
                    <td>${utils.formatarMoeda(estudio)}</td>
                    <td>${utils.formatarMoeda(repasse)}</td>
                    <td>${item.pagamento}</td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="app.servicos.excluir('${item.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
        this.atualizarTotais(dados);
    },

    atualizarTotais(servicos) {
        const totalValor = servicos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
        const totalEstudio = totalValor * 0.3;
        const totalRepasse = totalValor * 0.7;
        
        document.getElementById('servicos-total-valor').textContent = utils.formatarMoeda(totalValor);
        document.getElementById('servicos-total-estudio').textContent = utils.formatarMoeda(totalEstudio);
        document.getElementById('servicos-total-repasse').textContent = utils.formatarMoeda(totalRepasse);
    },

    aplicarFiltros() {
        const filtroTatuador = document.getElementById('filtro-tatuador')?.value;
        const filtroTipo = document.getElementById('filtro-tipo')?.value;
        const filtroPagamento = document.getElementById('filtro-pagamento')?.value;
        
        let filtrados = [...app.dados.servicos];
        
        if (filtroTatuador) filtrados = filtrados.filter(s => s.tatuador === filtroTatuador);
        if (filtroTipo) filtrados = filtrados.filter(s => s.tipo === filtroTipo);
        if (filtroPagamento) filtrados = filtrados.filter(s => s.pagamento === filtroPagamento);
        
        this.renderizarTabela(filtrados);
    },

    limparFiltros() {
        document.getElementById('filtro-tatuador').value = '';
        document.getElementById('filtro-tipo').value = '';
        document.getElementById('filtro-pagamento').value = '';
        this.carregar();
    },

    calcularRepasse() {
        const valor = parseFloat(document.getElementById('servico-valor').value) || 0;
        document.getElementById('servico-estudio').textContent = utils.formatarMoeda(valor * 0.3);
        document.getElementById('servico-repasse').textContent = utils.formatarMoeda(valor * 0.7);
    },

    salvar(event) {
        event.preventDefault();
        
        const servico = {
            id: utils.gerarId(),
            data: document.getElementById('servico-data').value,
            cliente: document.getElementById('servico-cliente').value,
            tatuador: document.getElementById('servico-tatuador').value,
            tipo: document.getElementById('servico-tipo').value,
            descricao: document.getElementById('servico-descricao').value,
            valor: parseFloat(document.getElementById('servico-valor').value) || 0,
            pagamento: document.getElementById('servico-pagamento').value
        };
        
        app.dados.servicos.push(servico);
        app.salvarDados();
        this.carregar();
        app.modals.close('modal-servico');
        utils.mostrarMensagem('sucesso', 'Serviço registrado com sucesso!');
        
        event.target.reset();
    },

    excluir(id) {
        if (!utils.confirmarAcao('Deseja realmente excluir este serviço?')) return;
        
        app.dados.servicos = app.dados.servicos.filter(item => item.id !== id);
        app.salvarDados();
        this.carregar();
        utils.mostrarMensagem('sucesso', 'Serviço excluído!');
    }
};

app.servicos = servicos;
export default servicos;
