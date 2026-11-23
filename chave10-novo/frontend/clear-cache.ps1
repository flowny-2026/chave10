# Script para limpar cache e reiniciar o servidor de desenvolvimento
# Chave 10 - Frontend

Write-Host "🧹 Limpando cache do Vite e build..." -ForegroundColor Cyan

# Remove pasta dist
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✅ Pasta 'dist' removida" -ForegroundColor Green
} else {
    Write-Host "⚠️  Pasta 'dist' não existe" -ForegroundColor Yellow
}

# Remove cache do Vite
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "✅ Cache do Vite removido" -ForegroundColor Green
} else {
    Write-Host "⚠️  Cache do Vite não existe" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Cache limpo com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Inicie o servidor: npm run dev" -ForegroundColor White
Write-Host "2. No navegador, pressione Ctrl+Shift+R para hard refresh" -ForegroundColor White
Write-Host "3. Ou abra uma aba anônima (Ctrl+Shift+N)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Dica: Se ainda não aparecer, feche TODAS as abas do navegador e abra novamente" -ForegroundColor Cyan
