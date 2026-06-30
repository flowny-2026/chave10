# Como Integrar o Botão de Aprovação na Página de Orçamentos

Este guia mostra como adicionar o botão "📱 Aprovação" na página de orçamentos existente.

## 1. Importar o Componente ApprovalManager

No início do arquivo `frontend/src/pages/app/Orcamentos.jsx`, adicione:

```javascript
import ApprovalManager from '../../components/ApprovalManager';
```

## 2. Adicionar Estado para Modal de Aprovação

Dentro do componente, adicione um novo estado:

```javascript
const [approvalModal, setApprovalModal] = useState(null); // ID do orçamento
```

## 3. Adicionar Botão na Tabela Desktop

Na seção onde os botões de ação são renderizados (dentro do `<td>` de ações), adicione:

```javascript
<button 
  className="btn btn-outline btn-sm" 
  onClick={() => setApprovalModal(orc.id)} 
  title="Enviar para aprovação"
>
  📱
</button>
```

**Exemplo completo:**

```javascript
<td>
  <div style={{display:'flex',gap:4}}>
    <button className="btn btn-outline btn-sm" onClick={()=>{setViewing(orc);setModal('ver');}}>👁️</button>
    <button className="btn btn-outline btn-sm" onClick={()=>imprimir(orc)} title="Imprimir">🖨️</button>
    <button className="btn btn-outline btn-sm" onClick={()=>enviarWhatsApp(orc)} title="WhatsApp">💬</button>
    <button className="btn btn-outline btn-sm" onClick={()=>setApprovalModal(orc.id)} title="Aprovação">📱</button>
    <button className="btn btn-outline btn-sm" onClick={()=>openEdit(orc)}>✏️</button>
    <button className="btn btn-outline btn-sm" onClick={()=>remove(orc.id)}>🗑️</button>
  </div>
</td>
```

## 4. Adicionar Botão nos Cards Mobile

Dentro do `<div className="os-card-actions">`:

```javascript
<button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();setApprovalModal(orc.id);}}>📱</button>
```

**Exemplo completo:**

```javascript
<div className="os-card-actions">
  <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();imprimir(orc);}}>🖨️</button>
  <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();setApprovalModal(orc.id);}}>📱</button>
  <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();openEdit(orc);}}>✏️</button>
  <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();enviarWhatsApp(orc);}}>💬</button>
  <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();remove(orc.id);}}>🗑️</button>
</div>
```

## 5. Renderizar o Modal de Aprovação

No final do componente, antes do último `</div>`, adicione:

```javascript
{/* Modal de Aprovação */}
{approvalModal && (
  <div className="modal-overlay open">
    <div className="modal" style={{maxWidth:600}}>
      <ApprovalManager
        orcamentoId={approvalModal}
        onClose={() => setApprovalModal(null)}
        onSuccess={() => {
          load(); // Recarrega a lista de orçamentos
        }}
      />
    </div>
  </div>
)}
```

## 6. Adicionar Badge de Status de Aprovação (Opcional)

Para mostrar visualmente o status de aprovação na lista, você pode adicionar um badge adicional.

Na coluna de status, modifique para:

```javascript
<td>
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    <span className={`badge ${STATUS_CLASS[orc.status]||'badge-gray'}`}>
      {STATUS_LABEL[orc.status]||orc.status}
    </span>
    {orc.approval_status && orc.approval_status !== 'pending' && (
      <span className={`badge ${
        orc.approval_status === 'approved' ? 'badge-green' : 
        orc.approval_status === 'rejected' ? 'badge-red' : 
        'badge-gray'
      }`} style={{fontSize:10}}>
        {orc.approval_status === 'approved' ? '✅ Aprovado' : 
         orc.approval_status === 'rejected' ? '❌ Rejeitado' : 
         '⏰ Expirado'}
      </span>
    )}
  </div>
</td>
```

## 7. Adicionar Filtro por Status de Aprovação (Opcional)

No filtro de status, você pode adicionar mais opções:

```javascript
<select className="dash-select" value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}>
  <option value="">Todos</option>
  <option value="pendente">Pendente</option>
  <option value="aprovado">Aprovado</option>
  <option value="rejeitado">Rejeitado</option>
  <option value="approval:pending">⏳ Aguardando Aprovação</option>
  <option value="approval:approved">✅ Cliente Aprovou</option>
  <option value="approval:rejected">❌ Cliente Rejeitou</option>
</select>
```

E no filtro da lista:

```javascript
const listaFiltrada = lista.filter(o => {
  const matchSearch = !search || 
    (o.cliente_nome||'').toLowerCase().includes(search.toLowerCase()) || 
    (o.numero||'').toLowerCase().includes(search.toLowerCase()) || 
    (o.descricao||'').toLowerCase().includes(search.toLowerCase());
  
  let matchStatus = true;
  if (statusFiltro) {
    if (statusFiltro.startsWith('approval:')) {
      const approvalStatus = statusFiltro.split(':')[1];
      matchStatus = o.approval_status === approvalStatus;
    } else {
      matchStatus = o.status === statusFiltro;
    }
  }
  
  return matchSearch && matchStatus;
});
```

## Resultado Final

Após essas alterações, você terá:

1. ✅ Botão 📱 em cada orçamento (desktop e mobile)
2. ✅ Modal completo de aprovação ao clicar
3. ✅ Opções para gerar link e enviar via WhatsApp
4. ✅ Visualização de estatísticas e histórico
5. ✅ Badge visual do status de aprovação (opcional)
6. ✅ Filtros por status de aprovação (opcional)

## Teste Rápido

1. Acesse a página de orçamentos
2. Clique no botão 📱 em qualquer orçamento
3. Selecione a validade e clique em "Gerar Link"
4. Copie o link e abra em outra aba
5. Aprove/rejeite o orçamento
6. Volte à página de orçamentos e veja o status atualizado

## Observações

- O botão só aparecerá se o componente `ApprovalManager` estiver corretamente importado
- Certifique-se de que o backend está rodando e as migrations foram executadas
- Os estilos CSS já estão incluídos no arquivo `ApprovalManager.css`
