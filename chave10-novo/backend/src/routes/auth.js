const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { queryOne, run } = require('../db');
const { SECRET, authMiddleware } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validate');
const {
  registerLimiter,
  googleAuthLimiter,
  sensitiveOpsLimiter,
} = require('../middleware/rateLimits');
const { audit, ACOES } = require('../services/auditService');
const { validateLogoUpload } = require('../middleware/uploadValidator');
const log = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── LOGIN ─────────────────────────────────────────────────────
// loginLimiter já aplicado no router pai (index.js) para /api/auth.
// Aqui não duplicamos — o limiter global de auth cobre esta rota.
router.post('/login', validateLogin, async (req, res) => {
  const { email, senha } = req.body;
  const ip = req.ip;
  try {
    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);

    // Hash fake garante tempo de resposta constante mesmo para emails inexistentes (timing-safe)
    const hashFake = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const hashAlvo = usuario?.senha_hash || hashFake;
    const senhaOk  = await bcrypt.compare(senha, hashAlvo);

    if (!usuario || !senhaOk) {
      log.loginFail({ email, ip });
      audit(req, ACOES.LOGIN_FALHA, 'usuarios', null, { email, motivo: 'credenciais_invalidas' }, 'falha',
        { id: null, nome: null, email, perfil: null, oficina_id: null });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (usuario.perfil === 'master_admin') {
      await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
      const token = jwt.sign(
        { id: usuario.id, perfil: 'master_admin', nome: usuario.nome },
        SECRET,
        { expiresIn: '7d' }
      );
      log.loginOk({ email, perfil: 'master_admin', ip });
      audit(req, ACOES.LOGIN, 'usuarios', usuario.id, { via: 'email', perfil: 'master_admin' }, 'sucesso',
        { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'master_admin', oficina_id: null });
      return res.json({
        token,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'master_admin', oficina_id: null }
      });
    }

    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) {
      // Oficina foi deletada — limpa vínculo
      await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [usuario.id]);
      log.loginFail({ email, motivo: 'oficina deletada, vinculo limpo', ip });
      return res.status(403).json({ error: 'needsOficina', needsOficina: true });
    }
    if (oficina.status_assinatura === 'blocked') {
      log.loginFail({ email, motivo: 'bloqueada', ip });
      return res.status(403).json({ error: 'blocked' });
    }
    if (oficina.status_assinatura === 'overdue') {
      log.loginFail({ email, motivo: 'overdue', ip });
      return res.status(403).json({ error: 'overdue' });
    }

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, oficina_id: usuario.oficina_id, nome: usuario.nome },
      SECRET,
      { expiresIn: '7d' }
    );
    log.loginOk({ email, perfil: usuario.perfil, oficina_id: usuario.oficina_id, ip });
    audit(req, ACOES.LOGIN, 'usuarios', usuario.id, { via: 'email', perfil: usuario.perfil, oficina_id: usuario.oficina_id }, 'sucesso',
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, oficina_id: usuario.oficina_id });
    res.json({
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
      }
    });
  } catch (err) {
    log.error('auth_login', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── REGISTRO MANUAL ───────────────────────────────────────────
// registerLimiter: 3 cadastros / hora por IP — anti spam de contas.
router.post('/register', registerLimiter, async (req, res) => {
  // Rota pública — validação inline (sem middleware de negócio)
  const nomeRaw  = req.body?.nome;
  const emailRaw = req.body?.email;
  const senhaRaw = req.body?.senha;

  if (!nomeRaw || typeof nomeRaw !== 'string' || nomeRaw.trim().length === 0 || nomeRaw.trim().length > 120) {
    return res.status(400).json({ error: 'Nome inválido (máx. 120 caracteres)' });
  }
  if (!emailRaw || typeof emailRaw !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw.trim())) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  if (!senhaRaw || typeof senhaRaw !== 'string' || senhaRaw.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }
  if (senhaRaw.length > 128) {
    return res.status(400).json({ error: 'Senha muito longa (máximo 128 caracteres)' });
  }

  const nome  = nomeRaw.trim();
  const email = emailRaw.trim().toLowerCase();

  try {
    const existe = await queryOne('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existe) {
      // Resposta genérica — não revela se o e-mail existe (anti-enumeração)
      // Gera um token falso com delay similar para manter timing constante
      await new Promise(r => setTimeout(r, 80 + Math.random() * 40));
      return res.status(201).json({ token: 'pending', needsOficina: true, message: 'Verifique seu e-mail para continuar' });
    }

    const hash = bcrypt.hashSync(senhaRaw, 12);
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', 1) RETURNING id",
      [nome, email, hash]
    );
    const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '7d' });
    audit(req, ACOES.REGISTRO, 'usuarios', r.id, { nome, email }, 'sucesso',
      { id: r.id, nome, email, perfil: 'admin_oficina', oficina_id: null });
    res.status(201).json({ token, needsOficina: true });
  } catch (err) {
    log.error('auth_register', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// ── LOGIN COM GOOGLE ──────────────────────────────────────────
// googleAuthLimiter: 10 autenticações / 15 min por IP.
router.post('/google', googleAuthLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== 'string' || credential.length > 4096) {
    return res.status(400).json({ error: 'Token Google não fornecido ou inválido' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google OAuth não configurado no servidor' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name: nome } = ticket.getPayload();

    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);

    // Usuário não existe — cria conta nova e pede dados da oficina
    if (!usuario) {
      const hash = bcrypt.hashSync(require('crypto').randomBytes(32).toString('hex'), 12);
      const r = await queryOne(
        "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', 1) RETURNING id",
        [nome, email, hash]
      );
      const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, needsOficina: true });
    }

    // Usuário existe mas sem oficina
    if (!usuario.oficina_id) {
      const token = jwt.sign({ id: usuario.id, perfil: 'admin_oficina', oficina_id: null, nome: usuario.nome }, SECRET, { expiresIn: '7d' });
      return res.json({ token, needsOficina: true });
    }

    // Usuário com oficina — verifica status da assinatura
    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) {
      // Oficina foi deletada — limpa o vínculo e pede nova oficina
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
      { expiresIn: '7d' }
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

// ── REGISTRO COM GOOGLE ───────────────────────────────────────
// googleAuthLimiter + registerLimiter em cadeia: restringe criação de contas via Google.
router.post('/google-register', googleAuthLimiter, registerLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== 'string' || credential.length > 4096) {
    return res.status(400).json({ error: 'Token Google não fornecido ou inválido' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google OAuth não configurado' });
  }

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
          const token = jwt.sign({ id: existe.id, perfil: 'admin_oficina', oficina_id: null, nome: existe.nome }, SECRET, { expiresIn: '7d' });
          return res.json({ token, needsOficina: true });
        }
        if (oficina.status_assinatura === 'blocked') return res.status(403).json({ error: 'blocked' });
        if (oficina.status_assinatura === 'overdue')  return res.status(403).json({ error: 'overdue' });
        await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), existe.id]);
        const token = jwt.sign({ id: existe.id, perfil: existe.perfil, oficina_id: existe.oficina_id, nome: existe.nome }, SECRET, { expiresIn: '7d' });
        return res.json({ token, needsOficina: false, usuario: { id: existe.id, nome: existe.nome, email, perfil: existe.perfil, oficina_id: existe.oficina_id } });
      }
      // Tem conta mas sem oficina
      const token = jwt.sign({ id: existe.id, perfil: 'admin_oficina', oficina_id: null, nome: existe.nome }, SECRET, { expiresIn: '7d' });
      return res.json({ token, needsOficina: true });
    }

    // Cria novo usuário sem oficina — senha aleatória (login só via Google)
    const hash = bcrypt.hashSync(require('crypto').randomBytes(32).toString('hex'), 12);
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo) VALUES(NULL, $1, $2, $3, 'admin_oficina', 1) RETURNING id",
      [nome, email, hash]
    );
    const token = jwt.sign({ id: r.id, perfil: 'admin_oficina', oficina_id: null, nome }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, needsOficina: true });
  } catch (err) {
    log.error('auth_google_register', err);
    res.status(500).json({ error: 'Erro ao cadastrar com Google' });
  }
});

// ── COMPLETAR DADOS DA OFICINA (após registro) ────────────────
// sensitiveOpsLimiter: 10 tentativas / 15 min — evita abuso do fluxo de onboarding.
router.post('/complete-oficina', sensitiveOpsLimiter, authMiddleware, validateLogoUpload, async (req, res) => {
  // Valida e sanitiza campos
  const nomeOficinaRaw = req.body?.nome_oficina;
  const telefoneRaw    = req.body?.telefone;

  if (!nomeOficinaRaw || typeof nomeOficinaRaw !== 'string' || nomeOficinaRaw.trim().length === 0) {
    return res.status(400).json({ error: 'Nome da oficina é obrigatório' });
  }
  if (nomeOficinaRaw.trim().length > 120) {
    return res.status(400).json({ error: 'Nome da oficina muito longo (máximo 120 caracteres)' });
  }
  if (!telefoneRaw || typeof telefoneRaw !== 'string' || telefoneRaw.trim().length === 0) {
    return res.status(400).json({ error: 'Telefone é obrigatório' });
  }
  if (telefoneRaw.trim().length > 30) {
    return res.status(400).json({ error: 'Telefone inválido' });
  }

  const nome_oficina = nomeOficinaRaw.trim();
  const telefone     = telefoneRaw.trim();

  // Sanitiza campos opcionais — rejeita qualquer coisa fora do esperado
  const cnpj_cpf = req.body?.cnpj_cpf
    ? String(req.body.cnpj_cpf).replace(/[^\d.\-\/]/g, '').slice(0, 20) || null
    : null;
  const endereco = req.body?.endereco
    ? String(req.body.endereco).replace(/<[^>]*>/g, '').trim().slice(0, 300) || null
    : null;

  // Logo: aceita data URL base64 (PNG/JPEG) limitado a ~200KB
  let logo = null;
  if (req.body?.logo && typeof req.body.logo === 'string') {
    if (req.body.logo.startsWith('data:image/') && req.body.logo.length < 280000) {
      logo = req.body.logo;
    }
  }

  try {
    const usuario = await queryOne('SELECT * FROM usuarios WHERE id=$1', [req.user.id]);
    if (!usuario)           return res.status(404).json({ error: 'Usuário não encontrado' });
    if (usuario.oficina_id) return res.status(409).json({ error: 'Oficina já cadastrada' });

    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 7);
    const dataVenc = vencimento.toISOString().split('T')[0];

    const oficina = await queryOne(
      "INSERT INTO oficinas(nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, observacoes, logo, endereco) VALUES($1, $2, $3, $4, 'trial', 'active', $5, $6, $7, $8) RETURNING id",
      [nome_oficina, usuario.nome, telefone, usuario.email, dataVenc, cnpj_cpf, logo, endereco]
    );

    await run('UPDATE usuarios SET oficina_id=$1 WHERE id=$2', [oficina.id, req.user.id]);

    const newToken = jwt.sign(
      { id: req.user.id, perfil: 'admin_oficina', oficina_id: oficina.id, nome: usuario.nome },
      SECRET,
      { expiresIn: '7d' }
    );

    log.info('oficina_auto_criada', { oficina_id: oficina.id, nome: nome_oficina, usuario_id: req.user.id });

    res.status(201).json({
      token: newToken,
      usuario: {
        id: req.user.id,
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

// ── /me — retorna dados atualizados do usuário logado ─────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const usuario = await queryOne('SELECT * FROM usuarios WHERE id=$1 AND ativo=1', [req.user.id]);
    if (!usuario) return res.status(401).json({ error: 'Usuário não encontrado' });

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
      responsavel: oficina.responsavel || usuario.nome,
    });
  } catch (err) {
    log.error('auth_me', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
