import {Workio}from "https://workio.dev/@0.0.8/mod.js";

const WorkerTemplate = new Workio((myName) => {
  function fixedFieldName(name: string, patternTemplate: string = "${match[1]}_${match[3]}.${match[2]}"): string {
    const pattern = /^(.+)\.([^.]+)_(\d+)$/;
    const match = name.match(pattern);
    if (match) {
      return new Function('match', `return \`${patternTemplate}\`;`)(match);
    }
    return name;
  }

function max(a,b) {
  if(a && b && a > b) return a;
  else if(a && b && a <= b) return b;
  else if(a) return a;
  else if(b) return b;
  else throw "wtf are a and b"
}

async function renameAndRecreateField(pdfDoc, form, oldField, newName) {
  const fieldType = oldField.constructor.name;

  let newField;
  switch (fieldType) {
    case 'PDFTextField':
    case 'PDFTextField2':
      newField = form.createTextField(newName);
      const newMax = max(newName.length, oldField.getMaxLength() || 0)
      newField.setMaxLength(newMax);
      newField.setText(newName);
      oldField.isMultiline() && newField.enableMultiline();
      break;
    case 'PDFCheckBox':
    case 'PDFCheckBox2':
      newField = form.createCheckBox(newName);
      newField.check(oldField.isChecked());
      break;
    case 'PDFRadioButton':
    case 'PDFRadioButton2':
      newField = form.createRadioGroup(newName);
      break;
    case 'PDFDropdown':
    case 'PDFDropdown2':
      newField = form.createDropdown(newName);
      newField.setOptions(oldField.getOptions());
      newField.select(oldField.getSelected());
      break;
    case 'PDFSignature':
    case 'PDFSignature2':
      newField = form.createSignature(newName);
      break;
    case 'PDFOptionList':
    case 'PDFOptionList2':
      newField = form.createOptionList(newName);
      newField.setOptions(oldField.getOptions());
      newField.select(oldField.getSelected());
      break;
    default:
      return;
  }

}

  async function devHelperAugment(pdfBuffer, renamePattern) {
    const { PDFDocument } = await import('https://raw.githubusercontent.com/General-Consulting/pdf-lib/v1.20.3/dist/pdf-lib.esm.js');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    for (const field of fields) {
      const newName = fixedFieldName(field.getName(), renamePattern);
      if (field.getName() !== newName) {
        await renameAndRecreateField(pdfDoc, form, field, newName);
      }
    }

    return pdfDoc.save();
  }

  async function generatePdfSchema(pdfBuffer) {
    const { PDFDocument } = await import('https://raw.githubusercontent.com/General-Consulting/pdf-lib/v1.20.3/dist/pdf-lib.esm.js');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Initialize the schema object
    let schema = {};

    // Function to add field and its properties to the schema
    function addFieldToSchema(path, field) {
      const parts = path.split(/[\.\[\]]/).filter(p => p !== ''); // Split and filter empty strings
      let current = schema;
      if(parts.length == 1) return;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;

        if (isLastPart) {
          // Add field properties here
          current[part] = { type: field.constructor.name, maxLength: field.getMaxLength ? field.getMaxLength() : null };
        } else {
          if (!current[part]) {
            current[part] = parts[i + 1].match(/^\d+$/) ? [] : {}; // Next part is index => create array, else object
          }
          current = current[part];
        }
      }
    }

    // Iterate over fields and construct schema
    fields.forEach(field => {
      const name = fixedFieldName(field.getName()); // Use your fixedFieldName function
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
  const workerInstance = new WorkerTemplate("Workio"); // create web worker
  const data = await Deno.readFile("./marked_up.pdf");

  const pdfBytes = await workerInstance.devHelperAugment(data.buffer, pattern);
  
  // Writing the modified PDF
  const pdfFileName = `convention-${key}.pdf`;
  await Deno.writeFile(pdfFileName, pdfBytes);
  console.log(`Modified PDF written to ${pdfFileName}`);

  // Generate schema and write it to a file
  const schema = await workerInstance.generatePdfSchema(pdfBytes); // Pass modified PDF bytes here
  const schemaFileName = `convention-${key}-schema.json`;
  await Deno.writeFile(schemaFileName, new TextEncoder().encode(JSON.stringify(schema, null, 2)));
  console.log(`Schema written to ${schemaFileName}`);

  await workerInstance.close(); // Close the worker instance
}



export {};
