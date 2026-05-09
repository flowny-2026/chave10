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
    if (!usuario || !senhaOk) { log.loginFail({email,ip}); return res.status(401).json({error:'Credenciais inválidas'}); }

    if (usuario.perfil === 'master_admin') {
      await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
      const token = jwt.sign({id:usuario.id,perfil:'master_admin',nome:usuario.nome}, SECRET, {expiresIn:'8h'});
      log.loginOk({email,perfil:'master_admin',ip});
      return res.json({token, usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,perfil:'master_admin',oficina_id:null}});
    }

    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) {
      // Oficina foi deletada — limpa vínculo
      await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [usuario.id]);
      log.loginFail({email,motivo:'oficina deletada, vínculo limpo',ip});
      return res.status(403).json({error:'needsOficina', needsOficina: true});
    }
    if (oficina.status_assinatura==='blocked') { log.loginFail({email,motivo:'bloqueada',ip}); return res.status(403).json({error:'blocked'}); }
    if (oficina.status_assinatura==='overdue')  { log.loginFail({email,motivo:'overdue',ip});   return res.status(403).json({error:'overdue'}); }

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign({id:usuario.id,perfil:usuario.perfil,oficina_id:usuario.oficina_id,nome:usuario.nome}, SECRET, {expiresIn:'8h'});
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
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

  try {
    const existe = await queryOne('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existe) return res.status(400).json({ error: 'E-mail já cadastrado' });

    const hash = bcrypt.hashSync(senha, 12);
    // Cria usuário sem oficina ainda (pendente)
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', 1) RETURNING id",
      [nome, email, hash]
    );
    const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '2h' });
    res.status(201).json({ token, needsOficina: true });
  } catch (err) {
    log.error('auth_register', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// LOGIN COM GOOGLE (login + registro automático numa rota só)
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google não fornecido' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth não configurado no servidor' });

  try {
    await atualizarVencidos();

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name: nome } = ticket.getPayload();

    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);

    // Usuário não existe — cria conta nova e pede dados da oficina
    if (!usuario) {
      const hash = bcrypt.hashSync(Math.random().toString(36), 10);
      const r = await queryOne(
        "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', 1) RETURNING id",
        [nome, email, hash]
      );
      const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '2h' });
      return res.status(201).json({ token, needsOficina: true });
    }

    // Usuário existe mas sem oficina
    if (!usuario.oficina_id) {
      const token = jwt.sign({ id: usuario.id, perfil: 'admin_oficina', oficina_id: null, nome: usuario.nome }, SECRET, { expiresIn: '2h' });
      return res.json({ token, needsOficina: true });
    }

    // Usuário com oficina — verifica status da assinatura
    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) {
      // Oficina foi deletada — limpa o vínculo e pede nova oficina
      await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [usuario.id]);
      const token = jwt.sign({ id: usuario.id, perfil: 'admin_oficina', oficina_id: null, nome: usuario.nome }, SECRET, { expiresIn: '2h' });
      return res.json({ token, needsOficina: true });
    }
    if (oficina.status_assinatura === 'blocked') return res.status(403).json({ error: 'blocked' });
    if (oficina.status_assinatura === 'overdue')  return res.status(403).json({ error: 'overdue' });

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, oficina_id: usuario.oficina_id, nome: usuario.nome },
      SECRET,
      { expiresIn: '8h' }
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
  if (!credential) return res.status(400).json({ error: 'Token Google não fornecido' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth não configurado' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name: nome } = ticket.getPayload();

    // Verifica se já existe
    const existe = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);
    if (existe) {
      // Já tem conta — faz login normal
      if (existe.oficina_id) {
        const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [existe.oficina_id]);
        if (!oficina) {
          // Oficina deletada — limpa vínculo e pede nova oficina
          await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [existe.id]);
          const token = jwt.sign({ id: existe.id, perfil: 'admin_oficina', oficina_id: null, nome: existe.nome }, SECRET, { expiresIn: '2h' });
          return res.json({ token, needsOficina: true });
        }
        if (oficina.status_assinatura === 'blocked') return res.status(403).json({ error: 'blocked' });
        if (oficina.status_assinatura === 'overdue')  return res.status(403).json({ error: 'overdue' });
        await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), existe.id]);
        const token = jwt.sign({ id: existe.id, perfil: existe.perfil, oficina_id: existe.oficina_id, nome: existe.nome }, SECRET, { expiresIn: '8h' });
        return res.json({ token, needsOficina: false, usuario: { id: existe.id, nome: existe.nome, email, perfil: existe.perfil, oficina_id: existe.oficina_id } });
      }
      // Tem conta mas sem oficina
      const token = jwt.sign({ id: existe.id, perfil: 'admin_oficina', oficina_id: null, nome: existe.nome }, SECRET, { expiresIn: '2h' });
      return res.json({ token, needsOficina: true });
    }

    // Cria novo usuário sem oficina
    const hash = bcrypt.hashSync(Math.random().toString(36), 10); // senha aleatória (login só via Google)
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', 1) RETURNING id",
      [nome, email, hash]
    );
    const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '2h' });
    res.status(201).json({ token, needsOficina: true });
  } catch (err) {
    log.error('auth_google_register', err);
    res.status(500).json({ error: 'Erro ao cadastrar com Google' });
  }
});

// COMPLETAR DADOS DA OFICINA (após registro)
router.post('/complete-oficina', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  let user;
  try { user = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: 'Token inválido' }); }

  const { nome_oficina, cnpj_cpf, telefone, endereco, logo } = req.body;
  if (!nome_oficina) return res.status(400).json({ error: 'Nome da oficina é obrigatório' });
  if (!telefone) return res.status(400).json({ error: 'Telefone é obrigatório' });

  try {
    // Verifica se usuário já tem oficina
    const usuario = await queryOne('SELECT * FROM usuarios WHERE id=$1', [user.id]);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (usuario.oficina_id) return res.status(400).json({ error: 'Oficina já cadastrada' });

    // Data de vencimento: 7 dias de trial
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 7);
    const dataVenc = vencimento.toISOString().split('T')[0];

    // Cria oficina
    const oficina = await queryOne(
      "INSERT INTO oficinas(nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, observacoes, logo, endereco) VALUES($1, $2, $3, $4, 'trial', 'active', $5, $6, $7, $8) RETURNING id",
      [nome_oficina, usuario.nome, telefone, usuario.email, dataVenc, cnpj_cpf || null, logo || null, endereco || null]
    );

    // Atualiza usuário com oficina_id
    await run('UPDATE usuarios SET oficina_id=$1 WHERE id=$2', [oficina.id, user.id]);

    // Gera token definitivo
    const newToken = jwt.sign(
      { id: user.id, perfil: 'admin_oficina', oficina_id: oficina.id, nome: usuario.nome },
      SECRET,
      { expiresIn: '8h' }
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

module.exports = router;
