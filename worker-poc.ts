const { Workio } = await import("https://workio.dev/@0.0.8/mod.js");

const WorkerTemplate = new Workio((myName) => {
  function fixedFieldName(name) {
    const pattern = /^(.+)\.([^.]+)_(\d+)$/;
    const match = name.match(pattern);
    if (match) {
      return `${match[1]}_${match[3]}.${match[2]}`;
    }
    return name;
  }

  function fixedFieldName(name) {
    const pattern = /^(.+)\.([^.]+)_(\d+)$/;
    const match = name.match(pattern);
    if (match) {
      return `${match[1]}_${match[3]}.${match[2]}`;
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
      console.log(`Unsupported field type: ${fieldType}`);
      return;
  }

}

async function listFillableFields(pdfBuffer) {
  const { PDFDocument } = await import('https://cdn.skypack.dev/pdf-lib@^1.17.1?dts');
  const { open } = await import('https://deno.land/x/open/index.ts');

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  // Collect field information for renaming
  const fieldInfo = fields.map(field => ({
    oldField: field,
    newName: fixedFieldName(field.getName())
  }));

  // Rename and recreate fields
  for (const { oldField, newName } of fieldInfo) {
    if (oldField.getName() !== newName) {
      await renameAndRecreateField(pdfDoc, form, oldField, newName);
    }
  }


  // Set field values to their field name
  const fields2 = form.getFields();
  fields2.forEach((field) => {

    const name = field.getName();
    const fixed = fixedFieldName(name);

    if (field.constructor.name.includes("PDFTextField")) {
      const newMax = max(fixed.length, field.getMaxLength() || 0)
      field.setMaxLength(newMax);
      field.setText(fixed)
    } else if (field.constructor.name.includes("PDFRadioGroup")) {
    } else if (field.constructor.name.includes("PDFCheckBox")) {
    } else if (field.constructor.name === "PDFDropdown") {
    } else {
    console.log("error processing", name, field.constructor.name, "is not supported")
    }


  });

  const pdfBytes = await pdfDoc.save();
  const fileName = 'reedited.pdf'
  const file = await Deno.create(fileName);
  const written = await file.write(pdfBytes);
  open(fileName);
  console.log(`${written} bytes written to ${fileName}`);
}

  return { listFillableFields, close }; // expose methods as return value
});

const workerInstance = new WorkerTemplate("Workio"); // create web worker

const data = await Deno.readFile("./marked_up.pdf");
await workerInstance.listFillableFields(data.buffer);

await workerInstance.close();

export {};
