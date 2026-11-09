# Benchmark del motor de análisis

Este directorio mide **precision / recall / F1** del motor determinístico de
`analysis-svc` contra cartolas etiquetadas.

## Cómo correrlo

```bash
npm run benchmark
npm run benchmark -- --strict   # falla si precision o recall < 90%
```

El reporte muestra, por caso:

- `TP`: hallazgo esperado y detectado.
- `FP`: hallazgo detectado que no estaba en la verdad esperada.
- `FN`: hallazgo esperado que el motor no detectó.

## Cómo agregar un caso

1. Agrega la cartola en `benchmarks/cartolas/<banco>-<caso>.csv`.
   Columnas mínimas: `fecha,descripcion,monto`.
   Columnas opcionales: `id_transaccion`, `tipo_anomalia`,
   `id_transaccion_referencia`, `motivo_reclamo`.
2. Agrega el caso en `benchmarks/cases.json`:

```json
{
  "file": "mi-banco.csv",
  "name": "Mi banco · caso",
  "bank": "Mi Banco",
  "expected": [
    { "type": "duplicate_commission", "amount": 90000 },
    { "type": "installment_error", "amount": 8500 }
  ]
}
```

La comparación es por `(tipo, monto redondeado)`, porque los IDs de
transacción los genera el parser.

## Importante

Los casos actuales son **sintéticos y controlados**: sirven como benchmark de
regresión para evitar que un cambio rompa una regla, no como prueba de
precisión real. El siguiente paso es reemplazarlos/ampliarlos con cartolas
reales anonimizadas por banco (ver Fase 2 del plan v2).
