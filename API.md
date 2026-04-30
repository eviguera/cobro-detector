# CobroDetector API v1

API REST para integración con sistemas contables.

## Autenticación

Todas las requests deben incluir el header:
```
Authorization: Bearer cd_xxx...
```

Las API keys se generan en: `POST /api/integrations/api-keys`

## Endpoints

### API Keys
- `GET /api/integrations/api-keys` - Listar keys
- `POST /api/integrations/api-keys` - Crear nueva key
- `DELETE /api/integrations/api-keys/:id` - Revocar key

### Empresas
- `GET /api/companies` - Listar empresas
- `POST /api/companies` - Crear empresa
- `GET /api/companies/:id` - Ver empresa
- `PATCH /api/companies/:id` - Actualizar empresa
- `DELETE /api/companies/:id` - Desactivar empresa

### Análisis
- `POST /api/analyze` - Subir estado de cuenta (multipart/form-data)
  - Body: `file`, `company_id` (opcional)
  - Retorna: `analysisId`, anomalías detectadas

- `GET /api/analyses/:id` - Obtener resultado de análisis

### Cartas de reclamo
- `POST /api/documents/complaint-letter` - Generar Word
  - Body: `{ analysisId: string }`
- `POST /api/documents/complaint-letter/pdf` - Generar PDF

## Ejemplo de uso

```bash
# Crear API key
curl -X POST https://cobrodetector.cl/api/integrations/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name": "ContaPlus", "permissions": ["read", "write"]}'

# Subir estado de cuenta
curl -X POST https://cobrodetector.cl/api/analyze \
  -H "Authorization: Bearer cd_xxx..." \
  -F "file=@estado_cuenta.pdf" \
  -F "company_id=uuid-de-empresa"
```

## Rate Limits

- 1000 requests/hora por API key
- IPs bloqueadas temporalmente por abuso
