-- =============================================================
-- SEED DEMO — teste@teste.com / demo1234
-- Cole e execute inteiro no Supabase SQL Editor
-- =============================================================

DO $$
DECLARE
  oid       INTEGER;
  cids      INTEGER[] := ARRAY[]::INTEGER[];
  vids      INTEGER[] := ARRAY[]::INTEGER[];
  os_id     INTEGER;
  pag_id    INTEGER;
  cid       INTEGER;
  vid       INTEGER;
  i         INTEGER;
  hoje      DATE := CURRENT_DATE;

  -- Nomes
  nomes TEXT[] := ARRAY[
    'Carlos Eduardo Mendes','Fernanda Lima Souza','Roberto Alves Costa','Juliana Pereira Martins',
    'Marcos Antônio Ferreira','Patrícia Oliveira Santos','Diego Henrique Rocha','Aline Cristina Barbosa',
    'Gustavo Henrique Lopes','Ana Paula Rodrigues','Thiago de Souza Lima','Renata Carvalho Dias',
    'Felipe Santos Araújo','Camila Ferreira Nunes','Eduardo Melo Vieira','Bruna Costa Cardoso',
    'Lucas Pereira Gomes','Larissa Almeida Freitas','André Luiz Monteiro','Vanessa Martins Pinto',
    'Rafael Conceição Silva','Priscila Ramos Nogueira','Fábio Augusto Correia','Mônica Tavares Figueiredo',
    'Rodrigo Nunes Rezende','Daniela Borges Campos','Alexandre Cunha Medeiros','Jéssica Vieira Cardoso',
    'Leandro Moreira Batista','Tatiane Souza Pinheiro','Vinícius Castro Ribeiro','Mariana Lima Coelho',
    'Bruno Ferreira Duarte','Isabela Sousa Carvalho','Henrique Oliveira Bastos','Luana Pereira Farias',
    'Mateus Rodrigues Santana','Carla Mendes Teixeira','Gabriel Alves Barbosa','Natália Costa Martins',
    'Ricardo Dias Vasconcelos','Beatriz Lopes Andrade','Sérgio Matos Fernandes','Amanda Rocha Cavalcanti',
    'Davi Nascimento Araújo','Letícia Gomes Fonseca','Renan Oliveira Marques','Sabrina Cruz Albuquerque',
    'Jonatan Pereira Cardoso','Érika Ferreira Monteiro','Murilo Alves Carneiro','Débora Santos Aguiar',
    'Kauã Rodrigues Braga','Vitória Lima Carvalho','Igor Souza Medeiros','Nayara Freitas Torres',
    'Cauê Melo Rezende','Raíssa Costa Pires','Wellington Martins Falcão','Paloma Alves Melo',
    'Éverton Fernandes Couto','Simone Nunes Vasconcelos','Cleber Rocha Leal','Flávia Dias Santos',
    'Nilton Carvalho Bezerra','Adriana Ferreira Lima','Edmilson Pereira Faria','Rosângela Costa Prado',
    'Sanderson Melo Duarte','Conceição Araújo Gomes','Wanderlei Alves Nogueira','Terezinha Lima Moreira',
    'Joseilton Souza Cardoso','Miriam Ferreira Neto','Jaílton Martins Souza','Alessandra Rocha Pinto',
    'Gleison Pereira Ramos','Valdirene Costa Barreto','Eraldo Nunes Siqueira','Margarida Alves Cunha',
    'Cleverson Rodrigues Lopes','Aparecida Ferreira Dias','Elson Melo Barbosa','Neuza Santos Teixeira',
    'Rone Oliveira Carvalho','Lindinalva Lima Medeiros','Sirley Pereira Figueiredo','Genivaldo Costa Freire',
    'Creuza Martins Braga','Nerino Alves Bastos','Iracema Ferreira Coelho','Zé Carlos Rodrigues',
    'Benedita Lima Souza','Ozéias Melo Cardoso','Quitéria Santos Araújo','Laudelino Pereira Fonseca',
    'Heverton Costa Dias','Vanderlei Ferreira Nogueira','Terezinha Alves Rezende','Osmildo Rodrigues Melo'
  ];

  marcas  TEXT[] := ARRAY['Chevrolet','Volkswagen','Fiat','Hyundai','Toyota','Honda','Jeep','Renault','Ford','Nissan','Mitsubishi','Peugeot','Kia'];
  modelos TEXT[] := ARRAY['Onix','Gol','Strada','HB20','Hilux','Civic','Compass','Kwid','Ka','Kicks','L200','208','Sportage','Polo','Argo','Creta','Corolla','HR-V','Renegade','Sandero','EcoSport','Frontier','Outlander','2008','Cerato','Tracker','Virtus','Pulse','Yaris','Fit'];
  anos    TEXT[] := ARRAY['2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
  placas  TEXT[] := ARRAY['ABC1D23','DEF4E56','GHI7F89','JKL0G12','MNO3H45','PQR6I78','STU9J01','VWX2K34','YZA5L67','BCD8M90','EFG1N23','HIJ4O56','KLM7P89','NOP0Q12','QRS3R45','TUV6S78','WXY9T01','ZAB2U34','CDE5V67','FGH8W90','ABD1X23','ACE4Y56','ADF7Z89','ADG0A12','ADH3B45','ADI6C78','ADJ9D01','ADK2E34','ADL5F67','ADM8G90','ADN1H23','ADO4I56','ADP7J89','ADQ0K12','ADR3L45','ADS6M78','ADT9N01','ADU2O34','ADV5P67','ADW8Q90','ADX1R23','ADY4S56','ADZ7T89','AEA0U12','AEB3V45','AEC6W78','AED9X01','AEE2Y34','AEF5Z67','AEG8A90','AEH1B23','AEI4C56','AEJ7D89','AEK0E12','AEL3F45','AEM6G78','AEN9H01','AEO2I34','AEP5J67','AEQ8K90','AER1L23','AES4M56','AET7N89','AEU0O12','AEV3P45','AEW6Q78','AEX9R01','AEY2S34','AEZ5T67','AFA8U90','AFB1V23','AFC4W56','AFD7X89','AFE0Y12','AFF3Z45','AFG6A78','AFH9B01','AFI2C34','AFJ5D67','AFK8E90','AFL1F23','AFM4G56','AFN7H89','AFO0I12','AFP3J45','AFQ6K78','AFR9L01','AFS2M34','AFT5N67','AFU8O90','AFV1P23','AFW4Q56','AFX7R89','AFY0S12','AFZ3T45','AGA6U78','AGB9V01','AGC2W34','AGD5X67','AGE8Y90','AGF1Z23'];
  problemas TEXT[] := ARRAY[
    'Troca de óleo e filtros — revisão preventiva',
    'Barulho ao frear — verificação do sistema de freios',
    'Revisão dos 10.000 km','Revisão dos 20.000 km','Revisão dos 30.000 km',
    'Revisão dos 50.000 km','Revisão dos 60.000 km','Revisão dos 80.000 km','Revisão dos 100.000 km',
    'Luz de injeção acesa no painel','Superaquecimento do motor',
    'Suspensão com barulho — amortecedores','Bateria fraca — dificuldade de partida',
    'Ar-condicionado não resfria','Vazamento de óleo no motor',
    'Pneu furado — troca e balanceamento','Alinhamento e balanceamento',
    'Troca de correia dentada','Diagnóstico eletrônico','Limpeza de bicos injetores',
    'Troca de embreagem','Reparo na transmissão','Troca de amortecedores dianteiros',
    'Troca de pastilhas e discos de freio','Revisão completa pré-viagem'
  ];
  servicos TEXT[] := ARRAY[
    'Troca de óleo 5W30, filtro de óleo e filtro de ar',
    'Substituição das pastilhas de freio dianteiras, sangria do fluido de freio',
    'Troca de óleo, filtros, velas de ignição e correia dentada',
    'Leitura de falhas com scanner, reset de erros, ajuste de injeção',
    'Substituição dos amortecedores dianteiros e traseiros, alinhamento',
    'Recarga do gás refrigerante R-134a, limpeza do filtro do ar-condicionado',
    'Troca da correia dentada, tensor e bomba d''água',
    'Limpeza ultrassônica dos 4 bicos injetores, teste de vazão',
    'Troca das 4 velas de ignição, teste de compressão',
    'Substituição dos discos e pastilhas de freio, fluido DOT4',
    'Alinhamento a laser, balanceamento dos 4 pneus',
    'Revisão completa: 30 itens verificados',
    'Troca da bateria 60Ah, limpeza dos terminais',
    'Troca de óleo do câmbio, revisão da transmissão',
    'Verificação e recarga do ar-condicionado'
  ];
  formas TEXT[] := ARRAY['pix','dinheiro','debito','credito','boleto'];

BEGIN

-- =============================================================
-- 1. REMOVE CONTA DEMO ANTERIOR
-- =============================================================
DELETE FROM referral_repasses     WHERE indicador_id IN (SELECT id FROM referral_indicadores WHERE oficina_id IN (SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com'));
DELETE FROM referral_comissoes    WHERE indicador_id IN (SELECT id FROM referral_indicadores WHERE oficina_id IN (SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com'));
DELETE FROM referral_indicacoes   WHERE indicador_id IN (SELECT id FROM referral_indicadores WHERE oficina_id IN (SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com'));
DELETE FROM referral_cliques      WHERE codigo_id    IN (SELECT id FROM referral_codigos     WHERE indicador_id IN (SELECT id FROM referral_indicadores WHERE oficina_id IN (SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com')));
DELETE FROM referral_codigos      WHERE indicador_id IN (SELECT id FROM referral_indicadores WHERE oficina_id IN (SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com'));
DELETE FROM referral_indicadores  WHERE oficina_id   IN (SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com');
DELETE FROM oficinas WHERE id IN (
  SELECT oficina_id FROM usuarios WHERE email = 'teste@teste.com'
);
DELETE FROM usuarios WHERE email = 'teste@teste.com';

-- =============================================================
-- 2. OFICINA
-- =============================================================
INSERT INTO oficinas(nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, endereco)
VALUES(
  'Oficina Mecânica Demo',
  'João da Silva',
  '(16) 99291-5540',
  'teste@teste.com',
  'mensal', 'active',
  (hoje + INTERVAL '365 days')::TEXT,
  'Av. das Indústrias, 500 — Distrito Industrial, Ribeirão Preto — SP'
) RETURNING id INTO oid;

-- =============================================================
-- 3. USUÁRIO  (senha: demo1234)
-- =============================================================
INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo)
VALUES(oid, 'João da Silva', 'teste@teste.com',
  '$2b$10$DkSGJJOLCiG9QsZloO/f8OgpaY1my74in.I8t9LKHM9EV8yreRs5e',
  'admin_oficina', 1);

-- =============================================================
-- 4. 100 CLIENTES
-- =============================================================
FOR i IN 1..100 LOOP
  INSERT INTO clientes(oficina_id, nome, telefone, email, endereco)
  VALUES(
    oid,
    nomes[i],
    '(16) 9' || (7000 + (i * 37 % 2999))::TEXT || '-' || (1000 + (i * 73 % 8999))::TEXT,
    'cliente' || i || '@email.com',
    'Rua ' || nomes[i] || ', ' || (i * 7 % 500 + 10)::TEXT || ' — Ribeirão Preto SP'
  ) RETURNING id INTO cid;
  cids := array_append(cids, cid);
END LOOP;

-- =============================================================
-- 5. 100 VEÍCULOS (1 por cliente)
-- =============================================================
FOR i IN 1..100 LOOP
  INSERT INTO veiculos(oficina_id, cliente_id, placa, modelo, marca, ano, km)
  VALUES(
    oid,
    cids[i],
    placas[i],
    modelos[(i % array_length(modelos,1)) + 1],
    marcas[(i % array_length(marcas,1)) + 1],
    anos[(i % array_length(anos,1)) + 1],
    ((i * 1337) % 175000 + 5000)::TEXT
  ) RETURNING id INTO vid;
  vids := array_append(vids, vid);
END LOOP;

-- =============================================================
-- 6. 50 OS FINALIZADAS (com pagamentos)
-- =============================================================
FOR i IN 1..50 LOOP
  INSERT INTO ordens_servico(
    oficina_id, cliente_id, veiculo_id, descricao, servicos,
    valor_mo, valor_pecas, valor, status, data, numero, data_conclusao
  ) VALUES(
    oid,
    cids[(i % 100) + 1],
    vids[(i % 100) + 1],
    problemas[(i % array_length(problemas,1)) + 1],
    servicos[(i % array_length(servicos,1)) + 1],
    (80 + (i * 17 % 520))::REAL,
    (50 + (i * 23 % 450))::REAL,
    (130 + (i * 17 % 520) + (i * 23 % 450))::REAL,
    'finalizado',
    (hoje - ((i * 3) % 180 + 1) * INTERVAL '1 day')::TEXT,
    lpad(i::TEXT, 4, '0'),
    NOW() - ((i * 3) % 180 + 1) * INTERVAL '1 day'
  ) RETURNING id INTO os_id;

  -- Pagamento para cada OS finalizada
  INSERT INTO pagamentos_os(
    oficina_id, os_id, cliente_id, forma, valor_total,
    taxa_maquininha, valor_liquido, valor_parcela,
    data_pagamento, boleto_vencimento, boleto_pendente, parcelas
  ) VALUES(
    oid, os_id, cids[(i % 100) + 1],
    formas[(i % 5) + 1],
    (130 + (i * 17 % 520) + (i * 23 % 450))::REAL,
    CASE WHEN (i % 5) IN (2,3) THEN 2.5 ELSE 0 END,
    ROUND(((130 + (i * 17 % 520) + (i * 23 % 450)) * 0.975)::NUMERIC, 2),
    ROUND(((130 + (i * 17 % 520) + (i * 23 % 450)) * 0.975)::NUMERIC, 2),
    (hoje - ((i * 3) % 180 + 1) * INTERVAL '1 day')::TEXT,
    -- boletos: últimos 5 ainda pendentes (vencimento futuro)
    CASE WHEN formas[(i % 5) + 1] = 'boleto' AND i > 45
      THEN (hoje + (i * 3 % 20 + 5) * INTERVAL '1 day')::TEXT
      ELSE NULL END,
    CASE WHEN formas[(i % 5) + 1] = 'boleto' AND i > 45 THEN TRUE ELSE FALSE END,
    CASE WHEN (i % 5) = 3 THEN 2 ELSE 1 END
  ) RETURNING id INTO pag_id;

  -- Parcelas a receber para crédito parcelado
  IF (i % 5) = 3 THEN
    INSERT INTO parcelas_receber(oficina_id, pagamento_os_id, os_id, cliente_id, numero_parcela, valor, data_recebimento, recebido)
    VALUES(
      oid, pag_id, os_id, cids[(i % 100) + 1], 1,
      ROUND(((130 + (i * 17 % 520) + (i * 23 % 450)) * 0.975 / 2)::NUMERIC, 2),
      (hoje + 30 * INTERVAL '1 day')::TEXT,
      CASE WHEN hoje > hoje + 30 * INTERVAL '1 day' THEN 1 ELSE 0 END
    );
    INSERT INTO parcelas_receber(oficina_id, pagamento_os_id, os_id, cliente_id, numero_parcela, valor, data_recebimento, recebido)
    VALUES(
      oid, pag_id, os_id, cids[(i % 100) + 1], 2,
      ROUND(((130 + (i * 17 % 520) + (i * 23 % 450)) * 0.975 / 2)::NUMERIC, 2),
      (hoje + 60 * INTERVAL '1 day')::TEXT,
      0
    );
  END IF;

END LOOP;

-- =============================================================
-- 7. 20 OS EM ANDAMENTO
-- =============================================================
FOR i IN 1..20 LOOP
  INSERT INTO ordens_servico(
    oficina_id, cliente_id, veiculo_id, descricao, servicos,
    valor_mo, valor_pecas, valor, status, data, numero
  ) VALUES(
    oid,
    cids[((i + 50) % 100) + 1],
    vids[((i + 50) % 100) + 1],
    problemas[(i % array_length(problemas,1)) + 1],
    servicos[(i % array_length(servicos,1)) + 1],
    (80 + (i * 29 % 400))::REAL,
    (30 + (i * 41 % 300))::REAL,
    (110 + (i * 29 % 400) + (i * 41 % 300))::REAL,
    'em_andamento',
    (hoje - (i % 7) * INTERVAL '1 day')::TEXT,
    lpad((50 + i)::TEXT, 4, '0')
  );
END LOOP;

-- =============================================================
-- 8. 10 OS CANCELADAS
-- =============================================================
FOR i IN 1..10 LOOP
  INSERT INTO ordens_servico(
    oficina_id, cliente_id, veiculo_id, descricao, servicos,
    valor_mo, valor_pecas, valor, status, data, numero
  ) VALUES(
    oid,
    cids[((i + 70) % 100) + 1],
    vids[((i + 70) % 100) + 1],
    problemas[(i % array_length(problemas,1)) + 1],
    '',
    0, 0, 0,
    'cancelada',
    (hoje - (i * 5) * INTERVAL '1 day')::TEXT,
    lpad((70 + i)::TEXT, 4, '0')
  );
END LOOP;

-- =============================================================
-- 9. 30 DESPESAS (passadas pagas + atrasadas + futuras)
-- =============================================================

-- Pagas no passado
INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES
(oid,'Aluguel da oficina — mês passado','Aluguel',3200.00,(hoje-30*INTERVAL'1 day')::TEXT,(hoje-30*INTERVAL'1 day')::TEXT,1),
(oid,'Energia elétrica — mês passado','Energia',480.50,(hoje-15*INTERVAL'1 day')::TEXT,(hoje-15*INTERVAL'1 day')::TEXT,1),
(oid,'Internet fibra 500MB','Internet',129.90,(hoje-10*INTERVAL'1 day')::TEXT,(hoje-10*INTERVAL'1 day')::TEXT,1),
(oid,'Conta de água','Água',92.00,(hoje-25*INTERVAL'1 day')::TEXT,(hoje-25*INTERVAL'1 day')::TEXT,1),
(oid,'Folha de pagamento — João','Folha de pagamento',2200.00,(hoje-30*INTERVAL'1 day')::TEXT,(hoje-30*INTERVAL'1 day')::TEXT,1),
(oid,'Folha de pagamento — Pedro','Folha de pagamento',1900.00,(hoje-30*INTERVAL'1 day')::TEXT,(hoje-30*INTERVAL'1 day')::TEXT,1),
(oid,'Compra de peças — Bosch','Peças/Estoque',1850.00,(hoje-20*INTERVAL'1 day')::TEXT,(hoje-20*INTERVAL'1 day')::TEXT,1),
(oid,'Compra de lubrificantes','Peças/Estoque',740.00,(hoje-20*INTERVAL'1 day')::TEXT,(hoje-20*INTERVAL'1 day')::TEXT,1),
(oid,'Boleto financiamento elevador','Boleto/Financiamento',850.00,(hoje-30*INTERVAL'1 day')::TEXT,(hoje-30*INTERVAL'1 day')::TEXT,1),
(oid,'Imposto DAS — Simples Nacional','Impostos',620.00,(hoje-30*INTERVAL'1 day')::TEXT,(hoje-30*INTERVAL'1 day')::TEXT,1);

-- Em atraso (vencidas, não pagas)
INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES
(oid,'Material de limpeza — atrasado','Manutenção',145.00,(hoje-15*INTERVAL'1 day')::TEXT,(hoje-5*INTERVAL'1 day')::TEXT,0),
(oid,'Ferramenta scanner automotivo','Ferramentas',320.00,(hoje-15*INTERVAL'1 day')::TEXT,(hoje-3*INTERVAL'1 day')::TEXT,0),
(oid,'Energia elétrica — atrasada','Energia',460.00,(hoje-15*INTERVAL'1 day')::TEXT,(hoje-1*INTERVAL'1 day')::TEXT,0);

-- Vence hoje / amanhã
INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES
(oid,'Aluguel da oficina — vence hoje','Aluguel',3200.00,(hoje-30*INTERVAL'1 day')::TEXT,hoje::TEXT,0),
(oid,'Energia elétrica — vence amanhã','Energia',480.00,(hoje-15*INTERVAL'1 day')::TEXT,(hoje+1*INTERVAL'1 day')::TEXT,0);

-- Futuras próximos 30 dias
INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES
(oid,'Internet — próxima fatura','Internet',129.90,hoje::TEXT,(hoje+5*INTERVAL'1 day')::TEXT,0),
(oid,'Folha de pagamento — mês atual','Folha de pagamento',4100.00,hoje::TEXT,(hoje+7*INTERVAL'1 day')::TEXT,0),
(oid,'Conta de água — mês atual','Água',92.00,hoje::TEXT,(hoje+10*INTERVAL'1 day')::TEXT,0),
(oid,'Google Ads — marketing digital','Marketing',400.00,hoje::TEXT,(hoje+15*INTERVAL'1 day')::TEXT,0),
(oid,'Combustível da van de coleta','Combustível',310.00,hoje::TEXT,(hoje+20*INTERVAL'1 day')::TEXT,0),
(oid,'Peças — compra parcelada (2/4)','Peças/Estoque',625.00,hoje::TEXT,(hoje+25*INTERVAL'1 day')::TEXT,0);

-- Futuras 60-90 dias
INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES
(oid,'Aluguel — próximo mês','Aluguel',3200.00,hoje::TEXT,(hoje+30*INTERVAL'1 day')::TEXT,0),
(oid,'Folha — próximo mês','Folha de pagamento',4100.00,hoje::TEXT,(hoje+35*INTERVAL'1 day')::TEXT,0),
(oid,'Energia — próximo mês','Energia',460.00,hoje::TEXT,(hoje+35*INTERVAL'1 day')::TEXT,0),
(oid,'Seguro da oficina','Boleto/Financiamento',520.00,hoje::TEXT,(hoje+45*INTERVAL'1 day')::TEXT,0),
(oid,'Peças — parcela 3/4','Peças/Estoque',625.00,hoje::TEXT,(hoje+55*INTERVAL'1 day')::TEXT,0),
(oid,'IPTU do imóvel','Impostos',1200.00,hoje::TEXT,(hoje+60*INTERVAL'1 day')::TEXT,0),
(oid,'Renovação do alvará','Impostos',390.00,hoje::TEXT,(hoje+90*INTERVAL'1 day')::TEXT,0);

-- Futuras 3-6 meses
INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES
(oid,'Aluguel — daqui 2 meses','Aluguel',3200.00,hoje::TEXT,(hoje+60*INTERVAL'1 day')::TEXT,0),
(oid,'Aluguel — daqui 3 meses','Aluguel',3200.00,hoje::TEXT,(hoje+90*INTERVAL'1 day')::TEXT,0),
(oid,'Aluguel — daqui 4 meses','Aluguel',3200.00,hoje::TEXT,(hoje+120*INTERVAL'1 day')::TEXT,0),
(oid,'Peças — parcela 4/4','Peças/Estoque',625.00,hoje::TEXT,(hoje+120*INTERVAL'1 day')::TEXT,0);

-- =============================================================
-- 10. 20 RECEBIMENTOS MANUAIS (cheques e acordos futuros)
-- =============================================================
INSERT INTO recebimentos_manuais(oficina_id,descricao,valor,vencimento,recebido) VALUES
(oid,'Cheque pré-datado — Carlos Mendes (OS #0012)',1850.00,(hoje+15*INTERVAL'1 day')::TEXT,0),
(oid,'Cheque pré-datado — Fernanda Lima (OS #0018)',940.00,(hoje+22*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo parcelado — Roberto Costa (parcela 1/3)',650.00,(hoje+30*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo parcelado — Roberto Costa (parcela 2/3)',650.00,(hoje+60*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo parcelado — Roberto Costa (parcela 3/3)',650.00,(hoje+90*INTERVAL'1 day')::TEXT,0),
(oid,'Cheque — Marcos Ferreira (revisão Hilux)',2200.00,(hoje+10*INTERVAL'1 day')::TEXT,0),
(oid,'Transferência agendada — Patrícia Santos',780.00,(hoje+45*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo — Diego Rocha (1/4)',420.00,(hoje+30*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo — Diego Rocha (2/4)',420.00,(hoje+60*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo — Diego Rocha (3/4)',420.00,(hoje+90*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo — Diego Rocha (4/4)',420.00,(hoje+120*INTERVAL'1 day')::TEXT,0),
(oid,'Cheque — Gustavo Lopes (serviço câmbio)',3100.00,(hoje+60*INTERVAL'1 day')::TEXT,0),
(oid,'Parcelado — Ana Paula Rodrigues (1/2)',870.00,(hoje+30*INTERVAL'1 day')::TEXT,0),
(oid,'Parcelado — Ana Paula Rodrigues (2/2)',870.00,(hoje+60*INTERVAL'1 day')::TEXT,0),
(oid,'Cheque pré-datado — Thiago Lima',1250.00,(hoje+90*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo de serviço — Renata Dias (1/3)',500.00,(hoje+30*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo de serviço — Renata Dias (2/3)',500.00,(hoje+150*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo de serviço — Renata Dias (3/3)',500.00,(hoje+270*INTERVAL'1 day')::TEXT,0),
(oid,'Cheque — Felipe Araújo (revisão anual)',1680.00,(hoje+180*INTERVAL'1 day')::TEXT,0),
(oid,'Acordo anual — Empresa Transportes XYZ (1/12)',950.00,(hoje+365*INTERVAL'1 day')::TEXT,0);

-- =============================================================
-- 11. ESTOQUE (20 peças)
-- =============================================================
INSERT INTO estoque(oficina_id,nome,categoria,quantidade,estoque_min,preco) VALUES
(oid,'Filtro de óleo Bosch','peca',15,5,28.90),
(oid,'Filtro de ar Mann','peca',10,3,35.50),
(oid,'Pastilha de freio Fras-le','peca',8,4,89.90),
(oid,'Óleo motor 5W30 Mobil 1L','fluido',24,10,32.00),
(oid,'Vela de ignição NGK','peca',20,8,18.50),
(oid,'Correia dentada Gates','peca',6,2,145.00),
(oid,'Fluido de freio DOT4 500ml','fluido',12,4,22.00),
(oid,'Amortecedor Monroe dianteiro','peca',4,2,320.00),
(oid,'Palheta limpador Bosch 18"','acessorio',10,4,42.00),
(oid,'Bateria 60Ah Moura','peca',3,1,480.00),
(oid,'Disco de freio ventilado','peca',5,2,165.00),
(oid,'Rolamento de roda dianteiro','peca',6,2,95.00),
(oid,'Bomba d''água original','peca',4,1,210.00),
(oid,'Tensor da correia dentada','peca',5,2,88.00),
(oid,'Filtro de combustível','peca',8,3,45.00),
(oid,'Vela glow diesel','peca',10,4,65.00),
(oid,'Óleo de câmbio ATF 1L','fluido',8,3,55.00),
(oid,'Kit embreagem completo','peca',2,1,580.00),
(oid,'Cabo de vela NGK','peca',7,2,72.00),
(oid,'Sensor de oxigênio','peca',3,1,185.00);

-- =============================================================
-- 12. AGENDA (próximos 15 dias)
-- =============================================================
INSERT INTO agenda(oficina_id,cliente_id,veiculo_id,titulo,data,hora,descricao) VALUES
(oid,cids[1],vids[1],'Revisão agendada — Carlos',(hoje+1*INTERVAL'1 day')::TEXT,'09:00','Revisão dos 45.000 km'),
(oid,cids[2],vids[2],'Troca de óleo — Fernanda',(hoje+1*INTERVAL'1 day')::TEXT,'10:30','Troca de óleo e filtros'),
(oid,cids[3],vids[3],'Alinhamento — Roberto',(hoje+2*INTERVAL'1 day')::TEXT,'08:00','Alinhamento e balanceamento'),
(oid,cids[4],vids[4],'Diagnóstico — Juliana',(hoje+2*INTERVAL'1 day')::TEXT,'14:00','Luz de injeção acesa'),
(oid,cids[5],vids[5],'Retirada do veículo — Marcos',(hoje+3*INTERVAL'1 day')::TEXT,'09:00','Retirada após revisão'),
(oid,cids[6],vids[6],'Troca de pneus — Patrícia',(hoje+3*INTERVAL'1 day')::TEXT,'11:00','Troca dos 4 pneus'),
(oid,cids[7],vids[7],'Freios — Diego',(hoje+4*INTERVAL'1 day')::TEXT,'09:30','Verificação das pastilhas'),
(oid,cids[8],vids[8],'Revisão — Aline',(hoje+5*INTERVAL'1 day')::TEXT,'10:00','Revisão completa'),
(oid,cids[9],vids[9],'Ar-condicionado — Gustavo',(hoje+5*INTERVAL'1 day')::TEXT,'14:30','Recarga do ar-condicionado'),
(oid,cids[10],vids[10],'Correia dentada — Ana Paula',(hoje+7*INTERVAL'1 day')::TEXT,'08:30','Troca da correia dentada'),
(oid,cids[11],vids[11],'Suspensão — Thiago',(hoje+7*INTERVAL'1 day')::TEXT,'13:00','Troca de amortecedores'),
(oid,cids[12],vids[12],'Revisão pré-viagem — Renata',(hoje+8*INTERVAL'1 day')::TEXT,'09:00','Revisão completa pré-viagem'),
(oid,cids[13],vids[13],'Diagnóstico — Felipe',(hoje+10*INTERVAL'1 day')::TEXT,'10:00','Verificação eletrônica'),
(oid,cids[14],vids[14],'Troca de óleo — Camila',(hoje+12*INTERVAL'1 day')::TEXT,'09:30','Troca de óleo e filtro'),
(oid,cids[15],vids[15],'Bateria — Eduardo',(hoje+14*INTERVAL'1 day')::TEXT,'11:00','Substituição da bateria');

-- =============================================================
-- 13. LEMBRETES
-- =============================================================
INSERT INTO lembretes(oficina_id,veiculo_id,tipo,descricao,data_previsao) VALUES
(oid,vids[1],'revisao','Revisão dos 45.000 km — Onix',(hoje+30*INTERVAL'1 day')::TEXT),
(oid,vids[2],'troca_oleo','Troca de óleo — Gol',(hoje+15*INTERVAL'1 day')::TEXT),
(oid,vids[3],'revisao','Revisão dos 60.000 km — Strada',(hoje+45*INTERVAL'1 day')::TEXT),
(oid,vids[4],'ipva','IPVA vence em 30 dias — HB20',(hoje+30*INTERVAL'1 day')::TEXT),
(oid,vids[5],'manutencao','Verificar vazamento — Hilux',(hoje+7*INTERVAL'1 day')::TEXT),
(oid,vids[6],'revisao','Revisão anual — Compass',(hoje+60*INTERVAL'1 day')::TEXT),
(oid,vids[7],'troca_oleo','Troca de óleo — Civic atrasada',(hoje-5*INTERVAL'1 day')::TEXT),
(oid,vids[8],'seguro','Renovação do seguro — Renegade',(hoje+20*INTERVAL'1 day')::TEXT),
(oid,vids[9],'revisao','Revisão dos 20.000 km — Kwid',(hoje+10*INTERVAL'1 day')::TEXT),
(oid,vids[10],'manutencao','Alinhamento necessário — Ka',(hoje+5*INTERVAL'1 day')::TEXT);

RAISE NOTICE '=============================================';
RAISE NOTICE 'Conta demo criada com sucesso!';
RAISE NOTICE 'Email:   teste@teste.com';
RAISE NOTICE 'Senha:   demo1234';
RAISE NOTICE '100 clientes, 100 veiculos, 80 OS';
RAISE NOTICE '30 despesas, 20 receb. manuais futuros';
RAISE NOTICE '=============================================';

END $$;
