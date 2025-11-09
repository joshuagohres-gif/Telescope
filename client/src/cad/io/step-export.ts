/**
 * STEP Export Implementation
 *
 * Exports OpenCascade shapes to STEP format (AP214/AP242).
 * STEP is the industry standard for CAD data exchange.
 */

import type { OCCTInstance } from '../runtime/occt-runtime';
import type { Shape } from '../types/cad-runtime';

// ===== TYPES =====

export interface StepExportOptions {
  schema?: 'AP214' | 'AP242';  // Application Protocol
  unit?: 'MM' | 'M' | 'IN';
  assembly?: boolean;          // Export as assembly with metadata
  metadata?: {
    author?: string;
    organization?: string;
    description?: string;
    authorization?: string;
  };
}

// ===== STEP EXPORT =====

/**
 * Export a shape to STEP format
 */
export function exportSTEP(
  oc: OCCTInstance,
  shape: any,  // OCCT TopoDS_Shape
  options: StepExportOptions = {}
): ArrayBuffer {
  const {
    schema = 'AP214',
    unit = 'MM',
    assembly = false,
    metadata = {},
  } = options;

  // Create STEP writer
  const writer = new oc.STEPControl_Writer_1();

  // Set schema (AP214 is most common, AP242 is newer)
  if (schema === 'AP242') {
    writer.SetWS(new oc.XSControl_WorkSession_1(), false);
  }

  // Set units
  const unitName = new oc.TCollection_AsciiString_2(unit);
  oc.Interface_Static.SetCVal(
    new oc.TCollection_AsciiString_2('write.step.unit'),
    unitName
  );
  unitName.delete();

  // Set precision
  const precision = new oc.TCollection_AsciiString_2('0.001');
  oc.Interface_Static.SetCVal(
    new oc.TCollection_AsciiString_2('write.precision.val'),
    precision
  );
  precision.delete();

  // Set metadata if provided
  if (metadata.author) {
    const author = new oc.TCollection_AsciiString_2(metadata.author);
    oc.Interface_Static.SetCVal(
      new oc.TCollection_AsciiString_2('write.step.author'),
      author
    );
    author.delete();
  }

  if (metadata.organization) {
    const org = new oc.TCollection_AsciiString_2(metadata.organization);
    oc.Interface_Static.SetCVal(
      new oc.TCollection_AsciiString_2('write.step.organization'),
      org
    );
    org.delete();
  }

  // Transfer shape
  const status = writer.Transfer(
    shape,
    assembly
      ? oc.STEPControl_StepModelType.STEPControl_AsIs
      : oc.STEPControl_StepModelType.STEPControl_ManifoldSolidBrep
  );

  if (status !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
    writer.delete();
    throw new Error(`STEP transfer failed with status: ${status}`);
  }

  // Write to temporary file path in Emscripten filesystem
  const filename = '/output.step';
  const filenameStr = new oc.TCollection_AsciiString_2(filename);
  const writeStatus = writer.Write(filenameStr);
  filenameStr.delete();

  if (writeStatus !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
    writer.delete();
    throw new Error(`STEP write failed with status: ${writeStatus}`);
  }

  // Read the file from Emscripten filesystem
  const fileBuffer = oc.FS.readFile(filename, { encoding: 'binary' });

  // Clean up
  oc.FS.unlink(filename);
  writer.delete();

  // Convert to ArrayBuffer
  return fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );
}

/**
 * Get STEP file as text (for debugging/viewing)
 */
export function exportSTEPText(
  oc: OCCTInstance,
  shape: any,
  options: StepExportOptions = {}
): string {
  const buffer = exportSTEP(oc, shape, options);
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * Download STEP file
 */
export function downloadSTEP(
  buffer: ArrayBuffer,
  filename = 'model.step'
): void {
  const blob = new Blob([buffer], { type: 'application/step' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
