import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

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
