#!/usr/bin/env python3
"""Concatena los módulos ES de cada sub-app en un solo <sub-app>/js/app.js
sin import/export.

Por qué existe: abrir cualquier index.html con doble clic usa el protocolo
file://, y ahí Chrome bloquea la carga de <script type="module"> por CORS
(aunque los archivos estén en la misma carpeta) -- es una restricción real
del navegador, no un bug. Un <script> normal (sin type="module") sí funciona
por file://, así que este script junta los módulos de cada sub-app (más los
compartidos de shared/ que use) en un solo archivo. Los archivos fuente se
quedan como ES modules de verdad para que `node --test` los siga importando.

Cada archivo se envuelve en su propio IIFE (su propio scope) -- así un
helper privado (ej. un `fmt()` que exista en más de un archivo) NUNCA choca,
aunque no esté exportado. El IIFE regresa un objeto con lo exportado
(`const api = (function(){ ...; return {leerDatos, ...}; })();`), que cubre
los `import * as api from '...'`; y cada nombre exportado se vuelve a
declarar suelto apuntando a esa misma función
(`const validarPeso = modelo.validarPeso;`) para cubrir también los
`import { validarPeso } from '...'`. Antes de generar cada paquete, revisa
que ningún nombre EXPORTADO se repita entre sus archivos (los privados ya no
pueden chocar gracias al IIFE, así que esos no hace falta revisarlos).

Uso: python build.py   (correr después de tocar cualquier archivo de shared/
o de js/ en el launcher, gastos/ o peso/)
"""
import re
import pathlib
import sys

RAIZ = pathlib.Path(__file__).parent

PAQUETES = {
    'launcher': {
        'salida': 'js/app.js',
        'archivos': ['shared/sesion.js', 'shared/api.js', 'js/ui.js'],
    },
    'gastos': {
        'salida': 'gastos/js/app.js',
        'archivos': [
            'shared/sesion.js', 'shared/api.js', 'shared/cifrado.js',
            'gastos/js/modelo.js', 'gastos/js/calculos.js', 'gastos/js/insights.js',
            'gastos/js/graficas.js', 'gastos/js/almacen.js', 'gastos/js/ui.js',
        ],
    },
    'peso': {
        'salida': 'peso/js/app.js',
        'archivos': [
            'shared/sesion.js', 'shared/api.js',
            'peso/js/modelo.js', 'peso/js/calculos.js', 'peso/js/graficas.js',
            'peso/js/cola.js', 'peso/js/ui.js',
        ],
    },
}


def _quitar_imports(texto: str) -> str:
    return re.sub(r'^import\s[\s\S]*?from\s+[\'"].*?[\'"];?\s*$\n?', '', texto, flags=re.MULTILINE)


def _nombres_exportados(texto: str) -> list[str]:
    return re.findall(r'^export\s+(?:async\s+function|function|const|class)\s+([A-Za-z0-9_]+)', texto, flags=re.MULTILINE)


def _quitar_prefijo_export(texto: str) -> str:
    return re.sub(r'^export\s+(function|const|async function|class)\s', r'\1 ', texto, flags=re.MULTILINE)


def construir_paquete(nombre: str, cfg: dict) -> None:
    vistos: dict[str, str] = {}
    partes = [f'// ARCHIVO GENERADO por build.py (paquete "{nombre}") -- no editar a mano.\n'
              '// Edita los archivos fuente y vuelve a correr: python build.py\n']

    for ruta_rel in cfg['archivos']:
        ruta = RAIZ / ruta_rel
        crudo = ruta.read_text(encoding='utf-8')
        exportados = _nombres_exportados(crudo)
        for n in exportados:
            if n in vistos:
                sys.exit(f'ERROR [{nombre}]: "{n}" se exporta en {vistos[n]} Y en {ruta_rel} -- '
                         f'chocarían como globales. Renombra uno de los dos antes de empaquetar.')
            vistos[n] = ruta_rel

        cuerpo = _quitar_prefijo_export(_quitar_imports(crudo))
        var = pathlib.Path(ruta_rel).stem
        partes.append(f'\n// ── {ruta_rel} ──────────────────────────────────────────\n')
        if exportados:
            partes.append(f'const {var} = (function () {{\n{cuerpo}\n'
                          f'  return {{ {", ".join(exportados)} }};\n}})();\n')
            for n in exportados:
                partes.append(f'const {n} = {var}.{n};\n')
        else:
            partes.append(cuerpo)  # ui.js: nada exportado, es el punto de entrada

    salida = RAIZ / cfg['salida']
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(''.join(partes), encoding='utf-8')
    print(f'OK [{nombre}] -> {cfg["salida"]} ({salida.stat().st_size} bytes)')


def main():
    for nombre, cfg in PAQUETES.items():
        construir_paquete(nombre, cfg)


if __name__ == '__main__':
    main()
