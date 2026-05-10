const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { query, queryOne, run, pool } = require('../db');
const { SECRET } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validate');
const log = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function atualizarVencidos() {
  const hoje = new Date().toISOString().split('T')[0];
  const grace = new Date(); grace.setDate(grace.getDate()-3);
  const graceStr = grace.toISOString().split('T')[0];
  await run("UPDATE oficinas SET status_assinatura='blocked' WHERE status_assinatura='overdue' AND data_vencimento < $1", [graceStr]);
  await run("UPDATE oficinas SET status_assinatura='overdue' WHERE status_assinatura IN ('active','pending') AND data_vencimento < $1", [hoje]);
}

router.post('/login', validateLogin, async (req, res) => {
  const { email, senha } = req.body;
  const ip = req.ip;
  try {
    await atualizarVencidos();
    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);
    const hashFake = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const hashAlvo = usuario?.senha_hash || hashFake;
    const senhaOk  = bcrypt.compareSync(senha, hashAlvo);
    if (!usuario || !senhaOk) { log.loginFail({email,ip}); return res.status(401).json({error:'Credenciais invÃ¡lidas'}); }

    if (usuario.perfil === 'master_admin') {
      await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
      const token = jwt.sign({id:usuario.id,perfil:'master_admin',nome:usuario.nome}, SECRET, {expiresIn:'30d'});
      log.loginOk({email,perfil:'master_admin',ip});
      return res.json({token, usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,perfil:'master_admin',oficina_id:null}});
    }

    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) {
      // Oficina foi deletada â€” limpa vÃ­nculo
      await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [usuario.id]);
      log.loginFail({email,motivo:'oficina deletada, vÃ­nculo limpo',ip});
      return res.status(403).json({error:'needsOficina', needsOficina: true});
    }
    if (oficina.status_assinatura==='blocked') { log.loginFail({email,motivo:'bloqueada',ip}); return res.status(403).json({error:'blocked'}); }
    if (oficina.status_assinatura==='overdue')  { log.loginFail({email,motivo:'overdue',ip});   return res.status(403).json({error:'overdue'}); }

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign({id:usuario.id,perfil:usuario.perfil,oficina_id:usuario.oficina_id,nome:usuario.nome}, SECRET, {expiresIn:'30d'});
    log.loginOk({email,perfil:usuario.perfil,oficina_id:usuario.oficina_id,ip});
    res.json({
      token,
      usuario:{
        id:usuario.id,
        nome:usuario.nome,
        email:usuario.email,
        perfil:usuario.perfil,
        oficina_id:usuario.oficina_id,
        data_vencimento: oficina.data_vencimento,
        status_assinatura: oficina.status_assinatura,
        plano: oficina.plano,
      }
    });
  } catch(err) { log.error('auth_login',err); res.status(500).json({error:'Erro interno'}); }
});

// REGISTRO MANUAL
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha sÃ£o obrigatÃ³rios' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter no mÃ­nimo 6 caracteres' });

  try {
    const existe = await queryOne('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existe) return res.status(400).json({ error: 'E-mail jÃ¡ cadastrado' });

    const hash = bcrypt.hashSync(senha, 12);
    // Cria usuÃ¡rio sem oficina ainda (pendente)
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', true) RETURNING id",
      [nome, email, hash]
    );
    const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, needsOficina: true });
  } catch (err) {
    log.error('auth_register', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// LOGIN COM GOOGLE (login + registro automÃ¡tico numa rota sÃ³)
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google nÃ£o fornecido' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth nÃ£o configurado no servidor' });

  try {
    await atualizarVencidos();

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name: nome } = ticket.getPayload();

    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);

    // UsuÃ¡rio nÃ£o existe â€” cria conta nova e pede dados da oficina
    if (!usuario) {
      const hash = bcrypt.hashSync(Math.random().toString(36), 10);
      const r = await queryOne(
        "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', true) RETURNING id",
        [nome, email, hash]
      );
      const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, needsOficina: true });
    }

    // UsuÃ¡rio existe mas sem oficina
    if (!usuario.oficina_id) {
      const token = jwt.sign({ id: usuario.id, perfil: 'admin_oficina', oficina_id: null, nome: usuario.nome }, SECRET, { expiresIn: '7d' });
      return res.json({ token, needsOficina: true });
    }

    // UsuÃ¡rio com oficina â€” verifica status da assinatura
    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) {
      // Oficina foi deletada â€” limpa o vÃ­nculo e pede nova oficina
      await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [usuario.id]);
      const token = jwt.sign({ id: usuario.id, perfil: 'admin_oficina', oficina_id: null, nome: usuario.nome }, SECRET, { expiresIn: '7d' });
      return res.json({ token, needsOficina: true });
    }
    if (oficina.status_assinatura === 'blocked') return res.status(403).json({ error: 'blocked' });
    if (oficina.status_assinatura === 'overdue')  return res.status(403).json({ error: 'overdue' });

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, oficina_id: usuario.oficina_id, nome: usuario.nome },
      SECRET,
      { expiresIn: '30d' }
    );
    log.loginOk({ email, perfil: usuario.perfil, oficina_id: usuario.oficina_id, via: 'google' });
    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        oficina_id: usuario.oficina_id,
        data_vencimento: oficina.data_vencimento,
        status_assinatura: oficina.status_assinatura,
        plano: oficina.plano,
      },
    });
  } catch (err) {
    log.error('auth_google_login', err);
    res.status(500).json({ error: 'Erro ao autenticar com Google' });
  }
});

// REGISTRO COM GOOGLE
router.post('/google-register', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google nÃ£o fornecido' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth nÃ£o configurado' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name: nome } = ticket.getPayload();

    // Verifica se jÃ¡ existe
    const existe = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);
    if (existe) {
      // JÃ¡ tem conta â€” faz login normal
      if (existe.oficina_id) {
        const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [existe.oficina_id]);
        if (!oficina) {
          // Oficina deletada â€” limpa vÃ­nculo e pede nova oficina
          await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [existe.id]);
          const token = jwt.sign({ id: existe.id, perfil: 'admin_oficina', oficina_id: null, nome: existe.nome }, SECRET, { expiresIn: '7d' });
          return res.json({ token, needsOficina: true });
        }
        if (oficina.status_assinatura === 'blocked') return res.status(403).json({ error: 'blocked' });
        if (oficina.status_assinatura === 'overdue')  return res.status(403).json({ error: 'overdue' });
        await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), existe.id]);
        const token = jwt.sign({ id: existe.id, perfil: existe.perfil, oficina_id: existe.oficina_id, nome: existe.nome }, SECRET, { expiresIn: '30d' });
        return res.json({ token, needsOficina: false, usuario: { id: existe.id, nome: existe.nome, email, perfil: existe.perfil, oficina_id: existe.oficina_id } });
      }
      // Tem conta mas sem oficina
      const token = jwt.sign({ id: existe.id, perfil: 'admin_oficina', oficina_id: null, nome: existe.nome }, SECRET, { expiresIn: '7d' });
      return res.json({ token, needsOficina: true });
    }

    // Cria novo usuÃ¡rio sem oficina
    const hash = bcrypt.hashSync(Math.random().toString(36), 10); // senha aleatÃ³ria (login sÃ³ via Google)
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', true) RETURNING id",
      [nome, email, hash]
    );
    const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, needsOficina: true });
  } catch (err) {
    log.error('auth_google_register', err);
    res.status(500).json({ error: 'Erro ao cadastrar com Google' });
  }
});

// COMPLETAR DADOS DA OFICINA (apÃ³s registro)
router.post('/complete-oficina', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token nÃ£o fornecido' });

  let user;
  try { user = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: 'Token invÃ¡lido' }); }

  const { nome_oficina, cnpj_cpf, telefone, endereco, logo } = req.body;
  if (!nome_oficina) return res.status(400).json({ error: 'Nome da oficina Ã© obrigatÃ³rio' });
  if (!telefone) return res.status(400).json({ error: 'Telefone Ã© obrigatÃ³rio' });

  try {
    // Verifica se usuÃ¡rio jÃ¡ tem oficina
    const usuario = await queryOne('SELECT * FROM usuarios WHERE id=$1', [user.id]);
    if (!usuario) return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
    if (usuario.oficina_id) return res.status(400).json({ error: 'Oficina jÃ¡ cadastrada' });

    // Data de vencimento: 7 dias de trial
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 7);
    const dataVenc = vencimento.toISOString().split('T')[0];

    // Cria oficina
    const oficina = await queryOne(
      "INSERT INTO oficinas(nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, observacoes, logo, endereco) VALUES($1, $2, $3, $4, 'trial', 'active', $5, $6, $7, $8) RETURNING id",
      [nome_oficina, usuario.nome, telefone, usuario.email, dataVenc, cnpj_cpf || null, logo || null, endereco || null]
    );

    // Atualiza usuÃ¡rio com oficina_id
    await run('UPDATE usuarios SET oficina_id=$1 WHERE id=$2', [oficina.id, user.id]);

    // Gera token definitivo
    const newToken = jwt.sign(
      { id: user.id, perfil: 'admin_oficina', oficina_id: oficina.id, nome: usuario.nome },
      SECRET,
      { expiresIn: '30d' }
    );

    log.info('oficina_auto_criada', { oficina_id: oficina.id, nome: nome_oficina, usuario_id: user.id });

    res.status(201).json({
      token: newToken,
      usuario: {
        id: user.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: 'admin_oficina',
        oficina_id: oficina.id,
        data_vencimento: dataVenc,
        status_assinatura: 'active',
      },
    });
  } catch (err) {
    log.error('auth_complete_oficina', err);
    res.status(500).json({ error: 'Erro ao criar oficina' });
  }
});

// â”€â”€ /me â€” retorna dados atualizados do usuÃ¡rio logado â”€â”€â”€â”€â”€â”€â”€â”€
// Usado pelo frontend para sincronizar data_vencimento e status_assinatura
// sem precisar fazer logout/login
const { authMiddleware } = require('../middleware/auth');
router.get('/me', authMiddleware, async (req, res) => {
  try {
    await atualizarVencidos();
    const usuario = await queryOne('SELECT * FROM usuarios WHERE id=$1 AND ativo=1', [req.user.id]);
    if (!usuario) return res.status(401).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });

    if (usuario.perfil === 'master_admin') {
      return res.json({
        id: usuario.id, nome: usuario.nome, email: usuario.email,
        perfil: 'master_admin', oficina_id: null,
      });
    }

    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) return res.status(403).json({ error: 'needsOficina', needsOficina: true });

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      oficina_id: usuario.oficina_id,
      data_vencimento: oficina.data_vencimento,
      status_assinatura: oficina.status_assinatura,
      plano: oficina.plano,
    });
  } catch (err) {
    log.error('auth_me', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;

