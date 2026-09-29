#!/usr/bin/env python3
"""Empaqueta cada app en un solo js/app.js y le pone versión nueva a sw.js.

Uso:  python build.py

Por qué existe: las páginas cargan app.js con un <script> normal (sin
type="module"), así funcionan con doble clic desde la carpeta y pasan la
política de seguridad (CSP) sin permitir módulos externos. Los archivos
fuente sí usan import/export; aquí se convierten en bloques
`const __modulo_x = (function () { ... })();` dentro de un solo archivo.

Después calcula una huella (hash) del contenido del "shell" (html/css/js
que lista sw.js) y la escribe en sw.js. Si algo cambió, la huella cambia,
el teléfono ve un sw.js distinto, baja todo de nuevo y la app se recarga
sola. Si no cambió nada, la huella queda igual y nadie vuelve a bajar nada.

Para agregar un archivo a una app: ponlo en la lista de su paquete en
PAQUETES, en orden de dependencias (lo que se importa va antes de quien lo
importa). El último de cada lista es el archivo principal (ui.js).
"""

import hashlib
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent

PAQUETES = {
    'launcher': ('js/app.js', [
        'shared/autorizacion.js',
        'shared/acceso_local.js',
        'shared/sesion.js',
        'shared/api.js',
        'shared/passkey.js',
        'shared/candado.js',
        'shared/fondo.js',
        'shared/liquid.js',
        'shared/cargando.js',
        'shared/dialogo.js',
        'js/ui.js',
    ]),
    'peso': ('peso/js/app.js', [
        'shared/autorizacion.js',
        'shared/acceso_local.js',
        'shared/sesion.js',
        'shared/api.js',
        'shared/fondo.js',
        'shared/ui_seguridad.js',
        'shared/actualizacion.js',
        'shared/liquid.js',
        'shared/dialogo.js',
        'peso/js/modelo.js',
        'peso/js/calculos.js',
        'peso/js/graficas.js',
        'peso/js/cola.js',
        'peso/js/actualizacion_peso.js',
        'peso/js/ui_helpers.js',
        'peso/js/ejercicio_modelo.js',
        'peso/js/ejercicio_almacen.js',
        'peso/js/ejercicio_calculos.js',
        'peso/js/ejercicio_graficas.js',
        'peso/js/ejercicio_ui.js',
        'peso/js/ui.js',
    ]),
    'gastos': ('gastos/js/app.js', [
        'shared/autorizacion.js',
        'shared/acceso_local.js',
        'shared/sesion.js',
        'shared/api.js',
        'shared/cifrado.js',
        'shared/passkey.js',
        'shared/candado.js',
        'shared/fondo.js',
        'shared/ui_seguridad.js',
        'shared/actualizacion.js',
        'shared/liquid.js',
        'shared/cargando.js',
        'shared/dialogo.js',
        'gastos/js/modelo.js',
        'gastos/js/calculos.js',
        'gastos/js/insights.js',
        'gastos/js/graficas.js',
        'gastos/js/almacen.js',
        'gastos/js/ui.js',
    ]),
}

SW = 'sw.js'
# Los bundles y sw.js se escriben con fin de línea de Windows (así los dejaba
# la versión original de este script); se conserva para no ensuciar el diff.
FIN_LINEA = '\r\n'

# El `\s*$` final es a propósito: se come el salto de línea del import cuando
# le sigue una línea vacía (así lo hacía el build original; mantenerlo deja
# los app.js idénticos byte por byte).
RE_IMPORT = re.compile(r"^import\s+([^;]+?)\s+from\s+['\"]([^'\"]+)['\"];?\s*$", re.M)
RE_EXPORT_DECL = re.compile(r'^export\s+((?:async\s+)?function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)', re.M)
RE_EXPORT_LISTA = re.compile(r'^export\s*\{([^}]*)\};?\s*$', re.M)


def nombre_modulo(ruta):
    return '__modulo_' + Path(ruta).stem


def transformar(ruta, codigo):
    """Quita import/export. Devuelve (código, nombres exportados)."""
    base = Path(ruta).parent

    def reemplazar_import(m):
        clausula, origen = m.group(1).strip(), m.group(2)
        destino = (base / origen).as_posix()
        estrella = re.fullmatch(r'\*\s+as\s+([A-Za-z_$][\w$]*)', clausula)
        if estrella:
            return f'const {estrella.group(1)} = {nombre_modulo(destino)};'
        # Import con nombre: esos nombres ya existen como constantes globales
        # (ver los alias que se escriben después de cada módulo).
        return ''

    codigo = RE_IMPORT.sub(reemplazar_import, codigo)

    declarados = RE_EXPORT_DECL.findall(codigo)
    exportados = [nombre for _, nombre in declarados]
    codigo = RE_EXPORT_DECL.sub(lambda m: f'{m.group(1)} {m.group(2)}', codigo)

    for m in RE_EXPORT_LISTA.finditer(codigo):
        for parte in m.group(1).split(','):
            parte = parte.strip()
            if parte:
                exportados.append(re.split(r'\s+as\s+', parte)[-1])
    codigo = RE_EXPORT_LISTA.sub('', codigo)
    return codigo, exportados


def empaquetar(nombre, archivos):
    salida = [
        f'// ARCHIVO GENERADO por build.py (paquete "{nombre}") -- no editar a mano.\n',
        '// Edita los archivos fuente y vuelve a correr: python build.py\n',
        '\n',
    ]
    globales = set()
    *modulos, principal = archivos
    for ruta in modulos:
        codigo, exportados = transformar(ruta, (RAIZ / ruta).read_text(encoding='utf-8'))
        var = nombre_modulo(ruta)
        salida.append(f'// ── {ruta} {"─" * 42}\n')
        if not exportados:
            # Sin exports (p. ej. shared/liquid.js): solo efecto al cargar,
            # va tal cual, sin envolver.
            salida.append(codigo.rstrip('\n') + '\n\n')
            continue
        salida.append(f'const {var} = (function () {{\n')
        salida.append(codigo.rstrip('\n') + '\n\n')
        salida.append(f'  return {{ {", ".join(exportados)} }};\n')
        salida.append('})();\n')
        for n in exportados:
            if n not in globales:
                globales.add(n)
                salida.append(f'const {n} = {var}.{n};\n')
        salida.append('\n')
    codigo, _ = transformar(principal, (RAIZ / principal).read_text(encoding='utf-8'))
    salida.append(f'// ── {principal} {"─" * 42}\n')
    salida.append(codigo)
    return ''.join(salida)


def escribir(ruta, texto):
    """Escribe solo si cambió. Devuelve True si cambió."""
    destino = RAIZ / ruta
    nuevo = texto.replace('\r\n', '\n').replace('\n', FIN_LINEA).encode('utf-8')
    if destino.exists() and destino.read_bytes() == nuevo:
        return False
    destino.write_bytes(nuevo)
    return True


def archivos_shell(sw):
    bloque = sw.split('const ARCHIVOS = [', 1)[1].split('];', 1)[0]
    return re.findall(r"'\./([^']+)'", bloque)


def versionar_sw():
    ruta = RAIZ / SW
    sw = ruta.read_text(encoding='utf-8')
    huella = hashlib.sha256()
    for archivo in archivos_shell(sw):
        huella.update(archivo.encode('utf-8') + b'\0')
        huella.update((RAIZ / archivo).read_bytes().replace(b'\r\n', b'\n'))
    version = huella.hexdigest()[:10]
    actual = re.search(r"const VERSION = '([0-9a-f]+)';", sw).group(1)
    if version == actual:
        return actual, False
    sw = sw.replace(actual, version)
    escribir(SW, sw)
    return version, True


def main():
    for nombre, (destino, archivos) in PAQUETES.items():
        faltan = [a for a in archivos if not (RAIZ / a).exists()]
        if faltan:
            sys.exit(f'Paquete "{nombre}": no existe {", ".join(faltan)}')
        cambio = escribir(destino, empaquetar(nombre, archivos))
        print(f'{destino}: {"actualizado" if cambio else "sin cambios"}')
    version, cambio = versionar_sw()
    print(f'{SW}: versión {version}{" (nueva)" if cambio else " (sin cambios)"}')


if __name__ == '__main__':
    main()
