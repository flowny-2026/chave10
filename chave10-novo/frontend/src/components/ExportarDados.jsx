import { useState } from 'react';
import { api } from '../api';

export default function ExportarDados() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function exportarJSON() {
    setLoading(true);
    setResultado(null);
    try {
      const data = await api.get('/app/exportar');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chave10_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setResultado({ tipo: 'success', msg: `Exportados: ${data.totais.clientes} clientes, ${data.totais.veiculos} veículos, ${data.totais.ordens_servico} OS, ${data.totais.orcamentos} orçamentos, ${data.totais.despesas} despesas, ${data.totais.estoque} itens de estoque` });
    } catch (err) {
      setResultado({ tipo: 'error', msg: err.error || 'Erro ao exportar dados' });
    } finally {
      setLoading(false);
    }
  }

  async function exportarExcel() {
    setLoading(true);
    setResultado(null);
    try {
      const data = await api.get('/app/exportar');
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      if (data.dados.clientes.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dados.clientes), 'Clientes');
      }
      if (data.dados.veiculos.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dados.veiculos), 'Veículos');
      }
      if (data.dados.ordens_servico.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dados.ordens_servico), 'OS');
      }
      if (data.dados.orcamentos.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dados.orcamentos), 'Orçamentos');
      }
      if (data.dados.despesas.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dados.despesas), 'Despesas');
      }
      if (data.dados.estoque.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.dados.estoque), 'Estoque');
      }

      // Usa blob para compatibilidade com mobile (writeFile não funciona em todos os browsers)
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chave10_dados_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setResultado({ tipo: 'success', msg: `Planilha exportada com ${data.totais.clientes} clientes, ${data.totais.veiculos} veículos, ${data.totais.ordens_servico} OS, ${data.totais.orcamentos} orçamentos` });
    } catch (err) {
      setResultado({ tipo: 'error', msg: err.error || 'Erro ao exportar' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <div className="card-title">📤 Exportar dados</div>
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Baixe todos os dados da sua oficina</span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16, lineHeight: 1.6 }}>
        Exporte seus dados para backup ou migração. Inclui clientes, veículos, ordens de serviço, orçamentos, despesas e estoque.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={exportarExcel} disabled={loading}>
          {loading ? '⏳ Exportando...' : '📊 Exportar Excel (.xlsx)'}
        </button>
        <button className="btn btn-outline" onClick={exportarJSON} disabled={loading}>
          {loading ? '⏳ Exportando...' : '💾 Exportar JSON (backup)'}
        </button>
      </div>

      {resultado && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13,
          background: resultado.tipo === 'success' ? '#f0fdf4' : '#fef2f2',
          color: resultado.tipo === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${resultado.tipo === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {resultado.tipo === 'success' ? '✅' : '❌'} {resultado.msg}
        </div>
      )}
    </div>
  );
}
