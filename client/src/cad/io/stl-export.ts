/**
 * STL Export Implementation
 *
 * Exports OpenCascade shapes to STL format (ASCII or binary).
 * STL is commonly used for 3D printing.
 */

import type { OCCTInstance } from '../runtime/occt-runtime';

// ===== TYPES =====

export interface StlExportOptions {
  binary?: boolean;              // Binary (true) or ASCII (false)
  linearDeflection?: number;     // Mesh quality (smaller = finer)
  angularDeflection?: number;    // Mesh quality (radians)
  relativeDeflection?: boolean;  // Relative to bounding box
}

// ===== STL EXPORT =====

/**
 * Export a shape to STL format
 */
export function exportSTL(
  oc: OCCTInstance,
  shape: any,  // OCCT TopoDS_Shape
  options: StlExportOptions = {}
): ArrayBuffer {
  const {
    binary = true,
    linearDeflection = 0.1,
    angularDeflection = 0.5,
    relativeDeflection = false,
  } = options;

  // First, mesh the shape
  const incrementalMesh = new oc.BRepMesh_IncrementalMesh_2(
    shape,
    linearDeflection,
    relativeDeflection,
    angularDeflection,
    true
  );
  incrementalMesh.Perform(new oc.Message_ProgressRange_1());
  incrementalMesh.delete();

  // Create STL writer
  const writer = new oc.StlAPI_Writer();

  // Set ASCII mode if requested
  if (!binary) {
    writer.SetASCIIMode(true);
  }

  // Write to temporary file in Emscripten filesystem
  const filename = binary ? '/output.stl' : '/output_ascii.stl';
  const filenameStr = new oc.TCollection_AsciiString_2(filename);
  const status = writer.Write(shape, filenameStr);
  filenameStr.delete();

  if (status !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
    writer.delete();
    throw new Error(`STL write failed with status: ${status}`);
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
 * Get STL file as text (ASCII mode only)
 */
export function exportSTLText(
  oc: OCCTInstance,
  shape: any,
  options: Omit<StlExportOptions, 'binary'> = {}
): string {
  const buffer = exportSTL(oc, shape, { ...options, binary: false });
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * Download STL file
 */
export function downloadSTL(
  buffer: ArrayBuffer,
  filename = 'model.stl',
  binary = true
): void {
  const blob = new Blob([buffer], {
    type: binary ? 'application/octet-stream' : 'text/plain',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
