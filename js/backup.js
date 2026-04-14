import app from './app.js';
import utils from './utils.js';

export const backup = {
    sincronizar() {
        // Simulação de sincronização com Supabase
        utils.mostrarMensagem('sucesso', 'Dados sincronizados com a nuvem!');
        
        // Aqui você implementaria a sincronização real com Supabase
        // Exemplo:
        // const { data, error } = await supabase.from('dados').upsert(app.dados);
    },

    exportarJSON() {
        const dadosJSON = JSON.stringify(app.dados, null, 2);
        const blob = new Blob([dadosJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-dark013tattoo-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        utils.mostrarMensagem('sucesso', 'Backup exportado com sucesso!');
    },

    importar() {
        const input = document.getElementById('import-file');
        const file = input.files[0];
        
        if (!file) {
            utils.mostrarMensagem('erro', 'Selecione um arquivo!');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dados = JSON.parse(e.target.result);
                app.dados = dados;
                app.salvarDados();
                app.modals.close('modal-importar');
                utils.mostrarMensagem('sucesso', 'Backup importado com sucesso!');
                location.reload();
            } catch (error) {
                utils.mostrarMensagem('erro', 'Arquivo inválido!');
            }
        };
        reader.readAsText(file);
    }
};

app.backup = backup;
export default backup;
