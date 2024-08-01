import { Command } from "https://deno.land/x/cliffy@v0.24.2/command/mod.ts";
import { PDFDocument, type PDFField, type PDFTextField } from "https://cdn.skypack.dev/pdf-lib@1.17.1";
import * as log from "https://deno.land/std@0.135.0/log/mod.ts";
import { S3Client, GetObjectCommand } from "https://cdn.skypack.dev/@aws-sdk/client-s3@3.621.0";
import { readAll } from "jsr:@std/io@0.224.3/read-all";

// Initialize logging
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: "{levelName} {msg}",
    }),
  },
  loggers: {
    default: {
      level: Deno.env.get("LOG_LEVEL") as any || "INFO",
      handlers: ["console"],
    },
  },
});

const logger = log.getLogger();

const DEBUG = Deno.env.get("LOG_LEVEL") === "DEBUG";

function fixedFieldName(name: string, patternTemplate?: string): string {
  if(!patternTemplate) return name;
  const pattern = /^(.+)\.([^._]+)_(\d+)\[\d+\]$/;
  const match = name.match(pattern);
  DEBUG && logger.debug(`DEBUG(fixedFieldName)`, match);
  if (match) {
    return new Function('match', `return \`${patternTemplate}\`;`)(match);
  }
  DEBUG && logger.warning(`WARN(fixedFieldName)`, `Field name ${name} does not match pattern`);
  return name;
}

function max(a: number, b: number) {
  if (a && b && a > b) return a;
  else if (a && b && a <= b) return b;
  else if (a) return a;
  else if (b) return b;
  else throw "wtf are a and b";
}

async function devHelperAugment(pdfBuffer: ArrayBuffer, renamePattern?: string) {
  logger.debug(`DEBUG(devHelperAugment)`, `Pattern: ${renamePattern}`);
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    const newName = fixedFieldName(field.getName(), renamePattern);
    if (field.getName() !== newName) {
      field.acroField.setPartialName(newName);
    }
    const fieldType = field.constructor.name;
    if (fieldType === 'PDFTextField' || fieldType === 'PDFTextField2') {
      const newMax = max(newName.length, (field as PDFTextField).getMaxLength() || 0);
      const lastPartOfName = newName.split('.').pop();
      logger.debug(`Field: ${field.getName()} -> ${newName} (max length: ${newMax})`);
      field.setMaxLength(newMax);
      field.setText(lastPartOfName);
    }
  }

  return pdfDoc.save();
}

async function generatePdfSchema(pdfBuffer: ArrayBuffer, renamePattern?: string) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const schema: Record<string, any> = {};

  function addFieldToSchema(path: string, field: PDFField) {
    const parts = path.split(/[\.\[\]]/).filter((p: string) => p !== '');
    let current = schema;
    if (parts.length == 1) return;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;

      if (isLastPart) {
        current[part] = { type: field.constructor.name, maxLength: (field as PDFTextField).getMaxLength ? (field as PDFTextField).getMaxLength() : null };
      } else {
        if (!current[part]) {
          current[part] = parts[i + 1].match(/^\d+$/) ? [] : {};
        }
        current = current[part];
      }
    }
  }

  fields.forEach((field: PDFField) => {
    const name = fixedFieldName(field.getName(), renamePattern);
    addFieldToSchema(name, field);
  });

  return schema;
}

async function getInputBuffer(input: string): Promise<ArrayBuffer> {
  if (input.startsWith("s3://")) {
    const url = new URL(input);
    const bucket = url.hostname;
    const key = url.pathname.slice(1);
    const client = new S3Client({});
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);
    return new Uint8Array(await readAll(response.Body)).buffer;
  } else if (input.startsWith("http://") || input.startsWith("https://")) {
    const response = await fetch(input);
    return new Uint8Array(await response.arrayBuffer()).buffer;
  } else {
    const data = await Deno.readFile(input);
    return data.buffer;
  }
}

const patterns = {
  hyphen: "${match[1]}_${match[3]}.${match[2]}",
  dot: "${match[1]}.${match[3]}_${match[2]}",
  bracket: "${match[1]}[${match[3]}].${match[2]}",
};

const program = new Command();

program
  .name("pdfForm2schema")
  .version("1.0.0")
  .description("CLI tool to generate schema from PDF form and optionally rename fields")
  .option("-p, --pattern <pattern>", "Pattern to rename fields")
  .option("-m, --markup-pdf <path>", "Path to save the marked-up PDF")
  .arguments("<input>")
  .action(async (options, input) => {
    const { pattern } = options;

    try {
      const dataBuffer = await getInputBuffer(input);
      logger.debug(`DEBUG(PATTERN LOOP)`, `Pattern: ${pattern}`);
      
      const pdfBytes = await devHelperAugment(dataBuffer, pattern);

      if (options.markupPdf) {
        await Deno.writeFile(options.markupPdf, new Uint8Array(pdfBytes));
        logger.debug(`Modified PDF written to ${options.markupPdf}`);
      }

      const schema = await generatePdfSchema(pdfBytes, pattern);
      console.log(JSON.stringify(schema, null, 2));
    } catch (error) {
      logger.error(`Error processing input: ${error.message}`);
    }
  });

if (import.meta.main) {
  program.parse(Deno.args);
}
