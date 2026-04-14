import app from './app.js';
import utils from './utils.js';

export const servicos = {
    async carregar() {
        await this.carregarDados();
        this.aplicarFiltros();
    },

    async carregarDados() {
        const { data, error } = await app.supabase
            .from('servicos')
            .select('*')
            .order('data', { ascending: false });

        if (error) {
            console.error('Erro ao carregar serviços:', error);
            utils.mostrarMensagem('erro', 'Erro ao carregar serviços');
            return;
        }

        app.dados.servicos = data || [];
        this.renderizarTabela(app.dados.servicos);
    },

    renderizarTabela(servicos) {
        const tbody = document.getElementById('servicos-table-body');
        const dados = servicos || [];

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

    async salvar(event) {
        event.preventDefault();

        const servico = {
            data: document.getElementById('servico-data').value,
            cliente: document.getElementById('servico-cliente').value,
            tatuador: document.getElementById('servico-tatuador').value,
            tipo: document.getElementById('servico-tipo').value,
            descricao: document.getElementById('servico-descricao').value,
            valor: parseFloat(document.getElementById('servico-valor').value) || 0,
            pagamento: document.getElementById('servico-pagamento').value
        };

        const { error } = await app.supabase
            .from('servicos')
            .insert([servico]);

        if (error) {
            console.error(error);
            utils.mostrarMensagem('erro', 'Erro ao salvar serviço!');
        } else {
            utils.mostrarMensagem('sucesso', 'Serviço salvo com sucesso!');
            app.modals.close('modal-servico');
            event.target.reset();
            await this.carregarDados();
            app.atualizarDashboard();
        }
    },

    async excluir(id) {
        if (!utils.confirmarAcao('Deseja realmente excluir este serviço?')) return;

        const { error } = await app.supabase
            .from('servicos')
            .delete()
            .eq('id', id);

        if (error) {
            utils.mostrarMensagem('erro', 'Erro ao excluir!');
        } else {
            utils.mostrarMensagem('sucesso', 'Serviço excluído!');
            await this.carregarDados();
            app.atualizarDashboard();
        }
    }
};

app.servicos = servicos;
export default servicos;        
