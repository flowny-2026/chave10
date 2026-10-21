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
        const ws = XLSX.utils.json_to_sheet(data.dados.clientes);
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      }
      if (data.dados.veiculos.length) {
        const ws = XLSX.utils.json_to_sheet(data.dados.veiculos);
        XLSX.utils.book_append_sheet(wb, ws, 'Veículos');
      }
      if (data.dados.ordens_servico.length) {
        const ws = XLSX.utils.json_to_sheet(data.dados.ordens_servico);
        XLSX.utils.book_append_sheet(wb, ws, 'OS');
      }
      if (data.dados.orcamentos.length) {
        const ws = XLSX.utils.json_to_sheet(data.dados.orcamentos);
        XLSX.utils.book_append_sheet(wb, ws, 'Orçamentos');
      }
      if (data.dados.despesas.length) {
        const ws = XLSX.utils.json_to_sheet(data.dados.despesas);
        XLSX.utils.book_append_sheet(wb, ws, 'Despesas');
      }
      if (data.dados.estoque.length) {
        const ws = XLSX.utils.json_to_sheet(data.dados.estoque);
        XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
      }

      XLSX.writeFile(wb, `chave10_dados_${new Date().toISOString().split('T')[0]}.xlsx`);
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
