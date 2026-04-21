/**
 * validador_socios.js
 *
 * Lee un CSV con emails de socios, valida cada correo y genera:
 * - emails_validos.csv
 * - emails_invalidos.csv
 *
 * Requisitos:
 * - Solo usa módulos nativos de Node.js (fs, path)
 */

const fs = require("fs");
const path = require("path");

// -------------------------------------------------------------
// Configuración de rutas de entrada/salida
// -------------------------------------------------------------
const inputFile = path.join(__dirname, "socios.csv");
const validOutputFile = path.join(__dirname, "emails_validos.csv");
const invalidOutputFile = path.join(__dirname, "emails_invalidos.csv");

// Arrays globales para resultados (según requisito solicitado)
var emailsValidos = [];
var emailsInvalidos = [];

// -------------------------------------------------------------
// Expresión regular robusta para validar emails
// Reglas que cubre:
// - Formato usuario@dominio.extension
// - Sin espacios
// - Dominio con al menos un punto
// - Extensión entre 2 y 6 caracteres
// -------------------------------------------------------------
const emailRegex = /^(?!.*\s)[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,6}$/;

/**
 * Escapa campos para CSV (comillas dobles internas y campos con separadores).
 * @param {string} value
 * @returns {string}
 */
function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Convierte una lista de emails en contenido CSV con cabecera.
 * @param {string[]} emails
 * @returns {string}
 */
function buildCsv(emails) {
  const lines = ["email", ...emails.map((e) => csvEscape(e))];
  return `${lines.join("\n")}\n`;
}

/**
 * Valida que exista cabecera "email" e identifica su índice.
 * @param {string[]} headers
 * @returns {number}
 */
function getEmailColumnIndex(headers) {
  const index = headers.findIndex((h) => h.trim().toLowerCase() === "email");
  if (index === -1) {
    throw new Error(
      "CSV mal formateado: no se encontró la columna 'email' en la cabecera."
    );
  }
  return index;
}

/**
 * Procesa el CSV de entrada, separa emails válidos/ inválidos y exporta resultados.
 */
function procesarSocios() {
  try {
    // 1) Comprobar si el archivo existe antes de leerlo
    if (!fs.existsSync(inputFile)) {
      throw new Error(`No existe el archivo de entrada: ${inputFile}`);
    }

    // 2) Leer contenido del CSV de forma asíncrona para no bloquear el hilo principal
    fs.readFile(inputFile, "utf8", (readError, rawData) => {
      try {
        if (readError) {
          throw readError;
        }

        if (!rawData.trim()) {
          throw new Error("El archivo CSV está vacío.");
        }

        // 3) Dividir por líneas usando split('\n')
        const lines = rawData
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length < 2) {
          throw new Error(
            "CSV mal formateado: debe contener cabecera y al menos una fila de datos."
          );
        }

        // 4) Detectar índice de la columna "email"
        const headers = lines[0].split(",");
        getEmailColumnIndex(headers);

        // 5) Parsear cada línea en partes y tomar el email como partes[1]
        for (const linea of lines.slice(0)) {
          const partes = linea.split(",");
          const emailOriginal = (partes[1] ?? "").replace("\r", "");
          const emailLimpio = emailOriginal.trim();

          // Si había espacios al inicio/fin, ya se considera inválido (no espacios).
          const hasOuterSpaces = emailOriginal !== emailLimpio;
          const isValid = !hasOuterSpaces && emailRegex.test(emailLimpio);

          if (isValid) {
            emailsValidos.push(emailLimpio);
          } else {
            emailsInvalidos.push(emailOriginal);
          }
        }

        // 7) Mostrar resumen final por consola
        const total = emailsValidos.length + emailsInvalidos.length;
        console.log("Resumen de validación de emails");
        console.log("--------------------------------");
        console.log(`Total procesados: ${total}`);
        console.log(`Válidos: ${emailsValidos.length}`);
        console.log(`Inválidos: ${emailsInvalidos.length}`);
        console.log(`Archivo generado: ${path.basename(validOutputFile)}`);
        console.log(`Archivo generado: ${path.basename(invalidOutputFile)}`);
      } catch (error) {
        // Manejo centralizado de errores de lectura/formato/escritura
        console.error("Error al procesar el CSV:", error.message);
        process.exitCode = 1;
      }
    });

    // 6) Exportar archivos CSV de salida fuera del callback principal
    fs.writeFileSync(validOutputFile, buildCsv(emailsValidos), "utf8");
    fs.writeFileSync(invalidOutputFile, buildCsv(emailsInvalidos), "utf8");
  } catch (error) {
    // Manejo centralizado de errores de lectura/formato/escritura
    console.error("Error al procesar el CSV:", error.message);
    process.exitCode = 1;
  }
}

// Punto de entrada del script
procesarSocios();
