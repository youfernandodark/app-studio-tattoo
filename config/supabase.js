import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'SUA_URL_SUPABASE_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANONIMA_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function testConnection() {
    try {
        const { data, error } = await supabase.from('caixa').select('count');
        if (error) throw error;
        console.log('✅ Conexão com Supabase estabelecida');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
    }
}
