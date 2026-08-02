// Fondo de pantalla personalizado (tu propia foto) -- vive en IndexedDB, no
// en localStorage: una foto pesa más de lo que localStorage aguanta cómodo
// sin arriesgar llenarlo y afectar lo demás guardado ahí (sesión, Face ID,
// caché de datos). Por dispositivo -- no se sincroniza entre celulares, pero
// SÍ es una sola clave por usuario (no por app): IndexedDB es del mismo
// origen para el launcher, Gastos y Peso, así que se elige una vez y se ve
// en las 3.

const NOMBRE_DB = 'ma_fondos';
const NOMBRE_TIENDA = 'fondos';

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(NOMBRE_TIENDA);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarFondo(usuario, blob) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOMBRE_TIENDA, 'readwrite');
    tx.objectStore(NOMBRE_TIENDA).put(blob, usuario);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function leerFondo(usuario) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOMBRE_TIENDA, 'readonly');
    const req = tx.objectStore(NOMBRE_TIENDA).get(usuario);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function borrarFondo(usuario) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOMBRE_TIENDA, 'readwrite');
    tx.objectStore(NOMBRE_TIENDA).delete(usuario);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Achica y recomprime la foto ANTES de guardarla -- una foto de celular
// puede pesar varios MB a full resolución; para un fondo de pantalla nadie
// necesita eso. 900px de ancho y calidad 0.72 deja algo de ~50-150 KB.
export function comprimirImagen(archivo, maxAncho = 900, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const ratio = Math.min(1, maxAncho / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('No se pudo procesar la imagen'));
      }, 'image/jpeg', calidad);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagen inválida'));
    };
    img.src = url;
  });
}
