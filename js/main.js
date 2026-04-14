import { supabase } from './supabaseClient.js';
import { testarConexao, showAlert } from './utils.js';
import { initNavigation } from './ui.js';
import { carregarCaixa, renderizarCaixa, ... } from './modules/caixa.js';
import { carregarServicos, ... } from './modules/servicos.js';
import { carregarAgenda, ... } from './modules/agenda.js';
import { carregarPiercings, carregarVendasPiercing } from './modules/piercing.js';
import { carregarMateriais, carregarUsosMateriais } from './modules/materiais.js';
import { atualizarDashboard } from './modules/dashboard.js';
import { carregarRelatorios } from './modules/relatorios.js';
import { exportarBackup, importarBackup } from './modules/backup.js';

document.addEventListener('DOMContentLoaded', async () => {
    await testarConexao(supabase);
    await Promise.all([
        carregarCaixa(),
        carregarServicos(),
        carregarAgenda(),
        carregarPiercings(),
        carregarVendasPiercing(),
        carregarMateriais(),
        carregarUsosMateriais()
    ]);
    atualizarDashboard();
    initNavigation();
    // Expor funções globais para os botões inline (onclick)
    window.abrirModalCaixa = () => openModal('modal-caixa');
    window.salvarCaixa = salvarCaixa;
    // ... todas as outras funções que são chamadas via onclick
});
