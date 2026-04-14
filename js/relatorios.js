import app from './app.js';
import utils from './utils.js';

export const relatorios = {
    carregar() {
        this.gerarRelatorioTatuador();
        this.gerarRelatorioRepasses();
        this.gerarRelatorioPiercings();
        this.gerarRelatorioMateriais();
        this.gerarRelatorioLucroLiquido();
    },

    gerarRelatorioTatuador() {
        const container = document.getElementById('relatorio-tatuador');
        const servicos = app.dados.servicos;
        
        const porTatuador = servicos.reduce((acc, s) => {
            acc[s.tatuador] = (acc[s.tatuador] || 0) + (parseFloat(s.valor) || 0);
            return acc;
        }, {});
        
        const html = Object.entries(porTatuador).map(([tatuador, total]) => `
            <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                <span>${tatuador}</span>
                <strong style="color: var(--accent)">${utils.formatarMoeda(total)}</strong>
            </div>
        `).join('');
        
        container.innerHTML = html || '<p class="loading">Sem dados</p>';
    },

    gerarRelatorioRepasses() {
        const container = document.getElementById('relatorio-repasses');
        const servicosThalia = app.dados.servicos.filter(s => s.tatuador === 'Thalia');
        const totalRepasse = servicosThalia.reduce((sum, s) => sum + ((parseFloat(s.valor) || 0) * 0.7), 0);
        
        container.innerHTML = `
            <div style="padding: 1rem;">
                <p>Total em serviços Thalia: <strong>${utils.formatarMoeda(servicosThalia.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0))}</strong></p>
                <p style="margin-top: 0.5rem; color: var(--accent); font-size: 1.2rem;">
                    Repasse (70%): <strong>${utils.formatarMoeda(totalRepasse)}</strong>
                </p>
            </div>
        `;
    },

    gerarRelatorioPiercings() {
        const container = document.getElementById('relatorio-piercings');
        const piercings = app.dados.piercings;
        
        const totalLucro = piercings.reduce((sum, p) => {
            const lucroUnit = (parseFloat(p.preco) || 0) - (parseFloat(p.custo) || 0);
            return sum + (lucroUnit * (parseInt(p.vendido) || 0));
        }, 0);
        
        const totalVendido = piercings.reduce((sum, p) => sum + (parseInt(p.vendido) || 0), 0);
        
        container.innerHTML = `
            <div style="padding: 1rem;">
                <p>Total vendido: <strong>${totalVendido} unidades</strong></p>
                <p style="margin-top: 0.5rem; color: var(--success); font-size: 1.2rem;">
                    Lucro total: <strong>${utils.formatarMoeda(totalLucro)}</strong>
                </p>
            </div>
        `;
    },

    gerarRelatorioMateriais() {
        const container = document.getElementById('relatorio-materiais');
        const materiais = app.dados.materiais;
        
        const totalGasto = materiais.reduce((sum, m) => {
            return sum + ((parseFloat(m.custo) || 0) * ((parseInt(m.usado) || 0) + (parseInt(m.estoque) || 0)));
        }, 0);
        
        container.innerHTML = `
            <div style="padding: 1rem;">
                <p>Total investido em materiais: <strong style="color: var(--danger)">${utils.formatarMoeda(totalGasto)}</strong></p>
            </div>
        `;
    },

    gerarRelatorioLucroLiquido() {
        const container = document.getElementById('relatorio-lucro-liquido');
        
        // Receitas
        const totalServicos = app.dados.servicos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
        const lucroPiercings = app.dados.piercings.reduce((sum, p) => {
            const lucroUnit = (parseFloat(p.preco) || 0) - (parseFloat(p.custo) || 0);
            return sum + (lucroUnit * (parseInt(p.vendido) || 0));
        }, 0);
        
        // Despesas
        const totalMateriais = app.dados.materiais.reduce((sum, m) => {
            return sum + ((parseFloat(m.custo) || 0) * (parseInt(m.usado) || 0));
        }, 0);
        
        const totalSaidas = app.dados.caixa.reduce((sum, c) => sum + (parseFloat(c.saidas) || 0), 0);
        
        const receitaTotal = totalServicos + lucroPiercings;
        const despesatotal = totalMateriais + totalSaidas;
        const lucroLiquido = receitaTotal - despesatotal;
        
        container.innerHTML = `
            <div style="padding: 1rem;">
                <p>Receita com serviços: <strong>${utils.formatarMoeda(totalServicos)}</strong></p>
                <p>Lucro com piercings: <strong>${utils.formatarMoeda(lucroPiercings)}</strong></p>
                <p style="margin-top: 0.5rem; color: var(--danger)">Gastos com materiais: <strong>${utils.formatarMoeda(totalMateriais)}</strong></p>
                <p>Outras saídas: <strong>${utils.formatarMoeda(totalSaidas)}</strong></p>
                <hr style="border-color: var(--border); margin: 1rem 0;">
                <p style="font-size: 1.3rem; color: ${lucroLiquido >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    <strong>Lucro Líquido: ${utils.formatarMoeda(lucroLiquido)}</strong>
                </p>
            </div>
        `;
    }
};

app.relatorios = relatorios;
export default relatorios;
