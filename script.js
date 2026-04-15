// ==================== SUPABASE (NÃO MEXIDO) ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'SEU_TOKEN';

let supabaseClient = null;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou.');
}

// ==================== CORE APP ====================
const App = {

    state: {
        caixa: [],
        servicos: [],
        agenda: []
    },

    // ==================== HELPERS ====================
    getEl(id){
        const el = document.getElementById(id);
        if(!el) console.warn(`Elemento #${id} não encontrado`);
        return el;
    },

    money(v){
        return new Intl.NumberFormat('pt-BR',{
            style:'currency',
            currency:'BRL'
        }).format(v || 0);
    },

    today(){
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    },

    alert(msg, type='info'){
        const container = this.getEl('alert-container');
        if(!container) return;

        const el = document.createElement('div');
        el.className = `alert alert-${type}`;
        el.innerText = msg;

        container.appendChild(el);
        setTimeout(()=>el.remove(),4000);
    },

    async safe(fn, msg){
        try {
            await fn();
        } catch(e){
            console.error(e);
            this.alert(msg + e.message, 'error');
        }
    },

    // ==================== CONEXÃO ====================
    async testarConexao(){
        if(!supabaseClient) return false;

        try {
            const { error } = await supabaseClient
                .from('caixa')
                .select('id')
                .limit(1);

            if(error) throw error;

            this.alert('Conectado ao Supabase','success');
            return true;

        } catch(e){
            this.alert('Erro conexão: '+e.message,'error');
            return false;
        }
    },

    // ==================== CAIXA ====================
    async carregarCaixa(){
        if(!supabaseClient) return;

        const { data, error } = await supabaseClient
            .from('caixa')
            .select('*')
            .order('data',{ascending:false});

        if(error) throw error;

        this.state.caixa = data || [];
        this.renderCaixa();
    },

    renderCaixa(){
        const tbody = this.getEl('caixa-tbody');
        if(!tbody) return;

        if(!this.state.caixa.length){
            tbody.innerHTML = '<tr><td colspan="7">Nenhum registro</td></tr>';
            return;
        }

        let html = '';
        let totalE = 0, totalS = 0;

        this.state.caixa.forEach(l=>{
            const ent = +l.entradas || 0;
            const sai = +l.saidas || 0;

            totalE += ent;
            totalS += sai;

            html += `
                <tr>
                    <td>${l.data}</td>
                    <td>${this.money(l.saldo_inicial)}</td>
                    <td style="color:#0f0">+${this.money(ent)}</td>
                    <td style="color:#f00">-${this.money(sai)}</td>
                    <td>${this.money(l.saldo_final)}</td>
                    <td>${l.descricao || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        this.getEl('caixa-total-entradas').innerText = this.money(totalE);
        this.getEl('caixa-total-saidas').innerText = this.money(totalS);
    },

    async salvarCaixa(){
        if(!supabaseClient) return;

        const data = {
            data: this.getEl('caixa-data').value,
            saldo_inicial: +this.getEl('caixa-saldo-inicial').value || 0,
            entradas: +this.getEl('caixa-entradas').value || 0,
            saidas: +this.getEl('caixa-saidas').value || 0,
            descricao: this.getEl('caixa-descricao').value
        };

        data.saldo_final = data.saldo_inicial + data.entradas - data.saidas;

        await this.safe(async()=>{
            const { error } = await supabaseClient
                .from('caixa')
                .insert([data]);

            if(error) throw error;

            this.alert('Salvo','success');
            await this.carregarCaixa();
        }, 'Erro ao salvar: ');
    },

    // ==================== SERVIÇOS ====================
    async carregarServicos(){
        if(!supabaseClient) return;

        const { data, error } = await supabaseClient
            .from('servicos')
            .select('*');

        if(error) throw error;

        this.state.servicos = data || [];
        this.renderServicos();
    },

    renderServicos(){
        const tbody = this.getEl('servicos-tbody');
        if(!tbody) return;

        let html = '';

        this.state.servicos.forEach(s=>{
            const val = +s.valor_total || 0;

            html += `
                <tr>
                    <td>${s.cliente || '-'}</td>
                    <td>${this.money(val)}</td>
                    <td>${s.tatuador_nome || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    // ==================== AGENDA ====================
    async carregarAgenda(){
        if(!supabaseClient) return;

        const { data, error } = await supabaseClient
            .from('agenda')
            .select('*');

        if(error) throw error;

        this.state.agenda = data || [];
        this.renderAgenda();
    },

    renderAgenda(){
        const tbody = this.getEl('agenda-tbody');
        if(!tbody) return;

        let html = '';

        this.state.agenda.forEach(a=>{
            html += `
                <tr>
                    <td>${a.cliente || '-'}</td>
                    <td>${a.data_hora}</td>
                    <td>${a.status}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    // ==================== INIT ====================
    async init(){

        if(!await this.testarConexao()) return;

        await this.safe(()=>this.carregarCaixa(), 'Erro caixa: ');
        await this.safe(()=>this.carregarServicos(), 'Erro serviços: ');
        await this.safe(()=>this.carregarAgenda(), 'Erro agenda: ');

        this.getEl('caixa-data').value = this.today();
    }
};

// ==================== START ====================
document.addEventListener('DOMContentLoaded', ()=> App.init());