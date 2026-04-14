import { supabase } from '../supabaseClient.js';
import { showAlert } from '../utils.js';

export async function exportarBackup() {
    try {
        const tables = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];
        const backup = { data_exportacao: new Date().toISOString() };

        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*');
            if (error) throw error;
            backup[table] = data;
        }

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup-dark013-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showAlert('Backup exportado com sucesso', 'success');
    } catch (err) {
        console.error(err);
        showAlert('Erro ao exportar backup', 'error');
    }
}

export async function importarBackup(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!confirm(`Importar backup de ${backup.data_exportacao}? Isso irá sobrescrever todos os dados atuais.`)) {
            input.value = '';
            return;
        }

        const tables = ['servicos', 'agenda', 'caixa', 'piercings_estoque', 'vendas_piercing', 'materiais_estoque', 'usos_materiais'];

        for (const table of tables) {
            if (backup[table] && backup[table].length) {
                // Limpa a tabela atual
                await supabase.from(table).delete().neq('id', 0);
                // Insere os dados do backup (removendo os ids para evitar conflito)
                const toInsert = backup[table].map(({ id, ...rest }) => rest);
                if (toInsert.length) {
                    const { error } = await supabase.from(table).insert(toInsert);
                    if (error) throw error;
                }
            }
        }

        showAlert('Backup importado com sucesso. A página será recarregada.', 'success');
        setTimeout(() => location.reload(), 2000);
    } catch (err) {
        console.error(err);
        showAlert('Erro ao importar backup: arquivo inválido', 'error');
    } finally {
        input.value = '';
    }
}
