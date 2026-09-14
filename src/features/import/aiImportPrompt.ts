import { language } from '../../i18n';

const en = `Convert the attached habit-tracker export into Oisiu Import JSON version 1.

Return only one valid JSON object. Do not wrap it in Markdown and do not add explanations.

Required top-level shape:
{
  "version": 1,
  "exportedAt": "2026-08-30T12:00:00.000Z",
  "habits": [
    {
      "id": "source-unique-habit-id",
      "parentId": null,
      "name": "Exercise",
      "emoji": "🏃",
      "type": "boolean",
      "sortOrder": 0,
      "isGeneral": false,
      "archivedAt": null,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ],
  "entries": [
    {
      "id": "source-unique-entry-id",
      "habitId": "source-unique-habit-id",
      "value": 1,
      "occurredAt": "2026-01-02T12:00:00.000Z",
      "localDate": "2026-01-02",
      "timezone": "UTC",
      "createdAt": "2026-01-02T12:00:00.000Z",
      "updatedAt": "2026-01-02T12:00:00.000Z"
    }
  ]
}

Conversion rules:
- Use a unique, stable string ID for every habit and entry. Prefix IDs with the source app name to reduce collision risk.
- parentId is null for a top-level habit or the ID of its parent.
- type must be "boolean", "number", or "duration". Every habit in one branch must use the same type.
- Boolean values are 0 or 1. Number values are non-negative decimals. Duration values are non-negative whole seconds.
- localDate uses YYYY-MM-DD and must not be in the future. Use one entry at most per habit and localDate.
- sortOrder starts at 0 and is consecutive among visible siblings under the same parent.
- Use isGeneral=false for normal habits. If a parent has children and also has its own direct records, create one hidden child named General with isGeneral=true and sortOrder=-1, then attach those direct records to it.
- All referenced parentId and habitId values must exist in this file. Do not create cycles.
- Use ISO 8601 timestamps. Preserve the source timezone when known; otherwise use "UTC".
- Preserve all source records. Do not calculate parent totals or duplicate a child value into its parent.
- If information is missing, choose a conservative default and keep IDs deterministic within this conversion.

Before returning the JSON, verify all IDs are unique, references resolve, sibling ordering is valid, dates and values follow the rules, and the output parses as strict JSON.`;

const es = `Convierte los datos adjuntos de una app de hábitos al formato JSON de importación de Oisiu, versión 1.

Devuelve un único objeto JSON válido, sin Markdown ni explicaciones.

Estructura obligatoria (conserva las claves y los valores técnicos en inglés):
{
  "version": 1,
  "exportedAt": "2026-08-30T12:00:00.000Z",
  "habits": [
    {
      "id": "id-unico-habito-origen",
      "parentId": null,
      "name": "Ejercicio",
      "emoji": "🏃",
      "type": "boolean",
      "sortOrder": 0,
      "isGeneral": false,
      "archivedAt": null,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ],
  "entries": [
    {
      "id": "id-unico-registro-origen",
      "habitId": "id-unico-habito-origen",
      "value": 1,
      "occurredAt": "2026-01-02T12:00:00.000Z",
      "localDate": "2026-01-02",
      "timezone": "UTC",
      "createdAt": "2026-01-02T12:00:00.000Z",
      "updatedAt": "2026-01-02T12:00:00.000Z"
    }
  ]
}

Reglas de conversión:
- Usa un ID de texto único y estable para cada hábito y registro. Añade como prefijo el nombre de la app de origen para reducir las colisiones.
- parentId es null para un hábito principal, o el ID de su padre.
- type debe ser "boolean", "number" o "duration". Todos los hábitos de una rama deben tener el mismo tipo.
- Los valores booleanos son 0 o 1. Los numéricos son decimales no negativos. Las duraciones son segundos enteros no negativos.
- localDate usa YYYY-MM-DD y no puede ser una fecha futura. Usa como máximo un registro por hábito y localDate.
- sortOrder empieza en 0 y es consecutivo entre los hermanos visibles del mismo padre.
- Usa isGeneral=false para los hábitos normales. Si un padre tiene hijos y registros propios, crea un hijo oculto llamado General con isGeneral=true y sortOrder=-1, y asígnale esos registros propios.
- Todos los parentId y habitId referenciados deben existir en el archivo. No crees ciclos.
- Usa marcas de tiempo ISO 8601. Conserva la zona horaria de origen si se conoce; en caso contrario, usa "UTC".
- Conserva todos los registros de origen. No calcules totales de los padres ni dupliques en ellos los valores de sus hijos.
- Si falta información, elige un valor predeterminado prudente y mantén los ID deterministas durante esta conversión.

Antes de devolver el JSON, verifica que los ID sean únicos, las referencias existan, el orden entre hermanos sea válido, las fechas y los valores cumplan las reglas y el resultado sea JSON estricto.`;

export const AI_IMPORT_PROMPT = language === 'es' ? es : en;
