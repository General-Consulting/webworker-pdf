const { Workio } = await import("https://workio.dev/@0.0.8/mod.js");

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

async function renameAndRecreateField(pdfDoc, form, oldField, newName): Promise<void> {
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

async function devHelperAugment(pdfBuffer, renamePattern, suffix) {
  const { PDFDocument } = await import('https://cdn.skypack.dev/pdf-lib@^1.17.1?dts');
  const { open } = await import('https://deno.land/x/open/index.ts');

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const pdfJsonPath = `./pdf-${suffix}.json`;
  const formJsonPath = `./form-${suffix}.json`;
  const fieldJsonPath = `./fields-${suffix}.json`;

  const formJson = safeStringify(form);
  const fieldJson = safeStringify(fields);
  const pdfJson = safeStringify(pdfDoc);

  // Collect field information for renaming
  const fieldInfo = fields.map(field => ({
    oldField: field,
    newName: fixedFieldName(field.getName(), renamePattern)
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
    const fixed = fixedFieldName(name, renamePattern);

    if (field.constructor.name.includes("PDFTextField")) {
      const newMax = max(fixed.length, field.getMaxLength() || 0)
      field.setMaxLength(newMax);
      field.setText(fixed)
    } else if (field.constructor.name.includes("PDFRadioGroup")) {
    } else if (field.constructor.name.includes("PDFCheckBox")) {
    } else if (field.constructor.name === "PDFDropdown") {
    } else {
    }


  });
function safeStringify(obj: any){
  let cache = [];
  const str = JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.includes(value)) return;
      cache.push(value);
    }
    return value;
  });
}

  const pdfBytes = await pdfDoc.save();
  const fileName = `convention-${suffix}.pdf`
  const file = await Deno.create(fileName);
  const formJsonFile = await Deno.create(formJsonPath);
  const jsonWritten = await formJsonFile.write(new TextEncoder().encode(formJson));
  const fieldJsonFile = await Deno.create(fieldJsonPath);
  const fieldJsonWritten = await fieldJsonFile.write(new TextEncoder().encode(fieldJson));
  const pdfJsonFile = await Deno.create(pdfJsonPath);
  const pdfJsonWritten = await pdfJsonFile.write(new TextEncoder().encode(pdfJson));
  const written = await file.write(pdfBytes);
  console.log(`${written} bytes written to ${fileName}`);
  console.log(`${jsonWritten} bytes written to ${formJsonPath}`);
  console.log(`${fieldJsonWritten} bytes written to ${fieldJsonPath}`);
  console.log(`${pdfJsonWritten} bytes written to ${pdfJsonPath}`);
  const cmd = new Deno.Command('xdg-open', {
      args: [
        fileName
      ]
    });
  const { code, stdout, stderr } = await cmd.output();
}

  return { devHelperAugment, close }; // expose methods as return value
});
const patterns = {
  hyphen: "${match[1]}_${match[3]}.${match[2]}",
  dot: "${match[1]}.${match[3]}.${match[2]}",
  bracket: "${match[1]}[${match[3]}].${match[2]}",
};

for (const [key, pattern] of Object.entries(patterns)) {
  const workerInstance = new WorkerTemplate("Workio"); // create web worker

  const data = await Deno.readFile("./marked_up.pdf");
  await workerInstance.devHelperAugment(data.buffer, pattern, key);
  await workerInstance.close(); // Consider moving this outside the loop if you need the worker instance later
}


export {};
