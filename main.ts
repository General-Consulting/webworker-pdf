import { PDFAcroField, PDFField, PDFTextField } from "https://cdn.skypack.dev/-/pdf-lib@v1.17.1-P8YmSI9gov9vMnrV7v2f/dist=es2019,mode=types/cjs/index.js";
import { Workio } from "https://workio.dev/@0.0.8/mod.js";

const WorkerTemplate = new Workio(() => {
const DEBUG = true;

  function fixedFieldName(name: string, patternTemplate: string): string {
    const pattern = /^(.+)\.([^._]+)_(\d+)\[\d+\]$/;
  
    const match = name.match(pattern);
    const DEBUG = true;
    DEBUG && console.log(`DEBUG(fixedFieldName)`, match);
    if (match) {
      return new Function('match', `return \`${patternTemplate}\`;`)(match);
    }
    DEBUG && console.warn(`WARN(fixedFieldName)`, `Field name ${name} does not match pattern`);
    return name;
  }
  
  const name = "topmostSubform[0].Page2[0].f2_45[0]";
  const patternTemplate = "${match[1]} ${match[2]} ${match[3]}";
  console.log(fixedFieldName(name, patternTemplate));
  
  function max(a: number, b: number) {
    if (a && b && a > b) return a;
    else if (a && b && a <= b) return b;
    else if (a) return a;
    else if (b) return b;
    else throw "wtf are a and b";
  }

  async function devHelperAugment(pdfBuffer: ArrayBuffer, renamePattern: string)  {
    console.log(`DEBUG(devHelperAugment)`, `Pattern: ${renamePattern}`);
    const { PDFDocument } = await import('https://raw.githubusercontent.com/General-Consulting/pdf-lib/v1.20.3/dist/pdf-lib.esm.js');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    for (const field of fields) {
      const newName = fixedFieldName(field.getName(), renamePattern);
      if (field.getName() !== newName) {
        field.acroField.setPartialName(newName);
      }
      const fieldType = field.constructor.name;
      switch (fieldType) {
        case 'PDFTextField':
        case 'PDFTextField2':
          {

            const newMax = max(newName.length, field.getMaxLength() || 0);
            field.setMaxLength(newMax);
            field.setText(newName);
            break;
          }
      }
    }

    return pdfDoc.save();
  }

  async function generatePdfSchema(pdfBuffer: ArrayBuffer, renamePattern: string) {
    const { PDFDocument } = await import('https://raw.githubusercontent.com/General-Consulting/pdf-lib/v1.20.3/dist/pdf-lib.esm.js');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Initialize the schema object
    const schema: Record<string, any> = {};

    // Function to add field and its properties to the schema
    function addFieldToSchema(path: string, field: PDFField) {
      const parts = path.split(/[\.\[\]]/).filter((p: string) => p !== ''); // Split and filter empty strings
      let current = schema;
      if (parts.length == 1) return;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;

        if (isLastPart) {
          // Add field properties here
          current[part] = { type: field.constructor.name, maxLength: (field as PDFTextField).getMaxLength ? (field as PDFTextField).getMaxLength() : null };
        } else {
          if (!current[part]) {
            current[part] = parts[i + 1].match(/^\d+$/) ? [] : {}; // Next part is index => create array, else object
          }
          current = current[part];
        }
      }
    }

    // Iterate over fields and construct schema
    fields.forEach((field: PDFField) => {
      const name = fixedFieldName(field.getName(), renamePattern); // Use your fixedFieldName function
      addFieldToSchema(name, field);
    });

    return schema;
  }

  return { devHelperAugment, generatePdfSchema, close }; // expose methods as return value
});

const patterns = {
  hyphen: "${match[1]}_${match[3]}.${match[2]}",
  dot: "${match[1]}.${match[3]}.${match[2]}",
  bracket: "${match[1]}[${match[3]}].${match[2]}",
};

for (const [key, pattern] of Object.entries(patterns)) {
  if(pattern === undefined) continue;
  const workerInstance = new WorkerTemplate("Workio"); // create web worker
  const data = await Deno.readFile("./marked_up.pdf");

  console.log(`DEBUG(PATTERN LOOP)`, `Key: ${key}, Pattern: ${pattern}`);
  const pdfBytes = await workerInstance.devHelperAugment(data.buffer, pattern);

  // Writing the modified PDF
  const pdfFileName = `convention-${key}.pdf`;
  await Deno.writeFile(pdfFileName, pdfBytes);
  console.log(`Modified PDF written to ${pdfFileName}`);

  // Generate schema and write it to a file
  const schema = await workerInstance.generatePdfSchema(pdfBytes, pattern); // Pass modified PDF bytes here
  const schemaFileName = `convention-${key}-schema.json`;
  await Deno.writeFile(schemaFileName, new TextEncoder().encode(JSON.stringify(schema, null, 2)));
  console.log(`Schema written to ${schemaFileName}`);

  await workerInstance.close(); // Close the worker instance
}



export { };
