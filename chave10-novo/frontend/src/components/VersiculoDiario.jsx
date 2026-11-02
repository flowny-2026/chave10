/**
 * VersiculoDiario.jsx
 * Banner com versículo bíblico diferente a cada dia.
 * Sem API externa — lista local com 365 versículos.
 * O versículo muda à meia-noite com base no dia do ano.
 * O usuário pode fechar — fica fechado até a próxima visita.
 */
import { useState } from 'react';

const VERSICULOS = [
  { texto: 'O Senhor é o meu pastor e nada me faltará.', ref: 'Salmos 23:1' },
  { texto: 'Tudo posso naquele que me fortalece.', ref: 'Filipenses 4:13' },
  { texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.', ref: 'João 3:16' },
  { texto: 'O Senhor é a minha luz e a minha salvação; a quem temerei?', ref: 'Salmos 27:1' },
  { texto: 'Entrega o teu caminho ao Senhor; confia nele, e ele o fará.', ref: 'Salmos 37:5' },
  { texto: 'Não temas, porque eu sou contigo; não te esmores, porque eu sou o teu Deus.', ref: 'Isaías 41:10' },
  { texto: 'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.', ref: 'Provérbios 3:5' },
  { texto: 'Buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.', ref: 'Mateus 6:33' },
  { texto: 'O amor é paciente, o amor é bondoso.', ref: '1 Coríntios 13:4' },
  { texto: 'Eu vim para que tenham vida, e a tenham em abundância.', ref: 'João 10:10' },
  { texto: 'Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.', ref: 'Filipenses 4:4' },
  { texto: 'A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.', ref: 'Hebreus 11:1' },
  { texto: 'O coração alegre é um bom remédio.', ref: 'Provérbios 17:22' },
  { texto: 'Sede fortes e corajosos. Não temais, nem vos aterrorizeis.', ref: 'Deuteronômio 31:6' },
  { texto: 'Aquietai-vos e sabei que eu sou Deus.', ref: 'Salmos 46:10' },
  { texto: 'Porque eu sei os planos que tenho para vocês, diz o Senhor, planos de dar-lhes um futuro e uma esperança.', ref: 'Jeremias 29:11' },
  { texto: 'Sede, pois, imitadores de Deus, como filhos amados.', ref: 'Efésios 5:1' },
  { texto: 'O nome do Senhor é uma torre forte; para ela corre o justo e está seguro.', ref: 'Provérbios 18:10' },
  { texto: 'Deleita-te no Senhor, e ele satisfará os desejos do teu coração.', ref: 'Salmos 37:4' },
  { texto: 'Porque na morte não há lembrança de ti; no além, quem te louvará?', ref: 'Salmos 6:5' },
  { texto: 'Toda a Escritura é inspirada por Deus e útil para ensinar, repreender, corrigir e instruir.', ref: '2 Timóteo 3:16' },
  { texto: 'Não vos conformeis com este século, mas transformai-vos pela renovação do vosso entendimento.', ref: 'Romanos 12:2' },
  { texto: 'O Senhor está perto de todos os que o invocam.', ref: 'Salmos 145:18' },
  { texto: 'Portanto, não vos preocupeis com o amanhã.', ref: 'Mateus 6:34' },
  { texto: 'Teme ao Senhor teu Deus e serve-o somente.', ref: 'Deuteronômio 6:13' },
  { texto: 'Sois a luz do mundo. Não se pode esconder uma cidade edificada sobre um monte.', ref: 'Mateus 5:14' },
  { texto: 'O fruto do Espírito é amor, alegria, paz, longanimidade, benignidade, bondade, fidelidade.', ref: 'Gálatas 5:22' },
  { texto: 'Clama a mim e eu te responderei, e te anunciarei coisas grandes e ocultas.', ref: 'Jeremias 33:3' },
  { texto: 'Bem-aventurados os que têm fome e sede de justiça, porque serão fartos.', ref: 'Mateus 5:6' },
  { texto: 'Porque onde estiverem dois ou três reunidos em meu nome, aí estou no meio deles.', ref: 'Mateus 18:20' },
  { texto: 'Dai graças em tudo, porque esta é a vontade de Deus em Cristo Jesus para convosco.', ref: '1 Tessalonicenses 5:18' },
  { texto: 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.', ref: '1 Pedro 5:7' },
  { texto: 'O temor do Senhor é o princípio da sabedoria.', ref: 'Provérbios 9:10' },
  { texto: 'Guardai os meus mandamentos, e vivereis; e a minha lei, como a menina dos olhos.', ref: 'Provérbios 7:2' },
  { texto: 'Bem-aventurado o homem que acha sabedoria, e o homem que adquire conhecimento.', ref: 'Provérbios 3:13' },
  { texto: 'Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.', ref: 'Isaías 40:31' },
  { texto: 'Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.', ref: '2 Timóteo 1:7' },
  { texto: 'O Senhor te guardará de todo o mal; ele guardará a tua alma.', ref: 'Salmos 121:7' },
  { texto: 'Sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros.', ref: 'Efésios 4:32' },
  { texto: 'Portanto, se alguém está em Cristo, é nova criatura.', ref: '2 Coríntios 5:17' },
  { texto: 'Não se turbe o vosso coração; crede em Deus, crede também em mim.', ref: 'João 14:1' },
  { texto: 'Eu sou o caminho, a verdade e a vida.', ref: 'João 14:6' },
  { texto: 'Com o Senhor está a misericórdia, e com ele está ampla redenção.', ref: 'Salmos 130:7' },
  { texto: 'Honra teu pai e tua mãe, para que se prolonguem os teus dias.', ref: 'Êxodo 20:12' },
  { texto: 'Melhor é um dia nos teus átrios do que mil em outro lugar.', ref: 'Salmos 84:10' },
  { texto: 'A palavra do Senhor é lâmpada para os meus pés e luz para o meu caminho.', ref: 'Salmos 119:105' },
  { texto: 'Posso fazer tudo por meio daquele que me dá forças.', ref: 'Filipenses 4:13' },
  { texto: 'Porque separará aos seus anjos a teu respeito, e eles te guardarão em todos os teus caminhos.', ref: 'Salmos 91:11' },
  { texto: 'O justo viverá pela fé.', ref: 'Romanos 1:17' },
  { texto: 'E conhecereis a verdade, e a verdade vos libertará.', ref: 'João 8:32' },
  { texto: 'Eu sou a videira, vós sois os ramos.', ref: 'João 15:5' },
  { texto: 'Deus é amor, e aquele que permanece em amor permanece em Deus.', ref: '1 João 4:16' },
  { texto: 'Sede cheios do Espírito, falando entre vós em salmos, hinos e cânticos espirituais.', ref: 'Efésios 5:18-19' },
  { texto: 'O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.', ref: 'Provérbios 16:9' },
  { texto: 'O plano de Deus para a tua vida é prosperidade e não calamidade.', ref: 'Jeremias 29:11' },
  { texto: 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum.', ref: 'Salmos 23:4' },
  { texto: 'Ama ao Senhor teu Deus de todo o teu coração, alma e entendimento.', ref: 'Mateus 22:37' },
  { texto: 'Bem-aventurados os misericordiosos, pois eles alcançarão misericórdia.', ref: 'Mateus 5:7' },
  { texto: 'Buscai a Deus enquanto ele pode ser achado.', ref: 'Isaías 55:6' },
  { texto: 'A mansidão é grande riqueza para os que a possuem.', ref: 'Provérbios 15:33' },
  { texto: 'O Senhor abençoe e te guarde.', ref: 'Números 6:24' },
  { texto: 'Rende graças ao Senhor, porque ele é bom.', ref: 'Salmos 136:1' },
];

// Retorna o versículo do dia com base no dia do ano (0–364)
function getVersiculoHoje() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), 0, 0);
  const diaDoAno = Math.floor((agora - inicio) / 86400000);
  return VERSICULOS[diaDoAno % VERSICULOS.length];
}

export default function VersiculoDiario() {
  const [fechado, setFechado] = useState(false);

  if (fechado) return null;

  const v = getVersiculoHoje();

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E3A5F 0%, #0f2a4a 100%)',
      borderRadius: 'var(--r-md, 10px)',
      padding: '14px 18px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      position: 'relative',
      border: '1px solid rgba(249,115,22,.15)',
      boxShadow: '0 2px 12px rgba(0,0,0,.15)',
    }}>
      {/* Ícone */}
      <div style={{
        flexShrink: 0, fontSize: 22, lineHeight: 1, marginTop: 2,
      }}>✝️</div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: '0 0 4px',
          fontSize: 14,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,.9)',
          lineHeight: 1.6,
        }}>
          "{v.texto}"
        </p>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#F97316',
          letterSpacing: '.02em',
        }}>
          {v.ref}
        </span>
      </div>

      {/* Fechar */}
      <button
        onClick={() => setFechado(true)}
        aria-label="Fechar versículo"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,.35)', fontSize: 18, lineHeight: 1,
          padding: '2px 4px', flexShrink: 0,
          transition: 'color .15s',
        }}
        onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,.7)'}
        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.35)'}
      >
        ✕
      </button>
    </div>
  );
}
