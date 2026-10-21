/**
 * imageCompressor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Compressão automática de imagens antes do upload.
 *
 * Redimensiona para no máximo 800px (largura ou altura)
 * Comprime em JPEG qualidade 70%
 * Retorna data URL base64 pronta para enviar à API
 *
 * Preparado para futuras evoluções:
 *   - Crop manual
 *   - Zoom
 *   - Rotação EXIF
 *   - Múltiplos tamanhos (thumbnail + full)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MAX_DIMENSION = 800;
const QUALITY       = 0.70;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB original (antes de comprimir)

/**
 * Comprime uma imagem File para data URL base64.
 *
 * @param {File} file - arquivo de imagem do input
 * @param {object} opts - { maxDimension, quality }
 * @returns {Promise<{ dataUrl, width, height, sizeBytes, originalSize }>}
 */
export function compressImage(file, opts = {}) {
  const maxDim  = opts.maxDimension || MAX_DIMENSION;
  const quality = opts.quality || QUALITY;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Arquivo não é uma imagem'));
    }
    if (file.size > MAX_FILE_SIZE) {
      return reject(new Error(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB`));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.onload = () => {
        // Calcula dimensões respeitando o limite
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        // Canvas para redimensionar e comprimir
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Converte para JPEG comprimido
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calcula tamanho aproximado do base64 decodificado
        const base64Data = dataUrl.split(',')[1];
        const sizeBytes  = Math.round(base64Data.length * 0.75);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
          originalSize: file.size,
          compressionRatio: Math.round((1 - sizeBytes / file.size) * 100),
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiplas imagens em paralelo.
 *
 * @param {FileList|File[]} files
 * @param {object} opts
 * @returns {Promise<Array<{ dataUrl, width, height, sizeBytes, error? }>>}
 */
export async function compressImages(files, opts = {}) {
  const results = [];
  for (const file of Array.from(files)) {
    try {
      const result = await compressImage(file, opts);
      results.push({ ...result, fileName: file.name });
    } catch (err) {
      results.push({ error: err.message, fileName: file.name });
    }
  }
  return results;
}

/**
 * Cria thumbnail pequeno para preview rápido (200px, qualidade 50%).
 */
export function createThumbnail(file) {
  return compressImage(file, { maxDimension: 200, quality: 0.50 });
}
