import { createClient } from '@supabase/supabase-js';

// Cliente com privilégios de Admin (Service Role)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { adminUserId, managerData } = req.body;
  const { email, password, fullName } = managerData;

  try {
    // 1. Validar se o solicitante é realmente ADMIN na sua tabela 'profiles'
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (profileError || !adminProfile || adminProfile.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Acesso negado: Apenas o Administrador da RCG MARKETS pode registar gestores.' 
      });
    }

    // 2. Criar a conta de autenticação no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    // 3. Registar o perfil na sua tabela 'profiles' existente
    const { data: managerProfile, error: dbError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authUser.user.id, // Relacionamento auth.users.id -> profiles.id
        full_name: fullName,
        role: 'GESTOR',
        balance: 0.00
      }])
      .select();

    if (dbError) throw dbError;

    return res.status(200).json({
      message: 'Gestor gravado com sucesso na base de dados!',
      manager: managerProfile[0]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
