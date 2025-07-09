import qrisDinamis from 'qris-dinamis';
import { join } from 'path';
import * as fs from 'fs';

/**
 * Helper for QRIS operations using qris-dinamis package
 */
export class QrisHelper {

   /**
   * Default QRIS code for Rosantike Motorent
   */
    static readonly DEFAULT_QRIS_CODE = '00020101021126650013ID.CO.BCA.WWW011893600014000285360602150008850028536060303UMI51440014ID.CO.QRIS.WWW0215ID10253788672750303UMI5204751253033605802ID5918ROSANTIKE MOTORENT6006MALANG61056512262070703A016304491E';

  /**

   * Default tax type ('r' for rupiah, 'p' for percentage)
   */
  static readonly DEFAULT_TAX_TYPE: 'r' | 'p' = 'r';

  /**
   * Default fee amount
   */
  static readonly DEFAULT_FEE = '0';

  /**
   * Convert static QRIS to dynamic QRIS string
   * @param qrisCode Static QRIS code
   * @param nominal Amount in Rupiah
   * @param options Additional options (taxtype, fee)
   * @returns Dynamic QRIS string
   */

  static makeDynamicString(
    qrisCode: string,
    nominal: string,
    options?: { taxtype?: 'r' | 'p'; fee?: string },
  ): string {
    return qrisDinamis.makeString(qrisCode, {
      nominal: parseInt(nominal).toString(),
      taxtype: options?.taxtype || this.DEFAULT_TAX_TYPE,
      fee: options?.fee || this.DEFAULT_FEE,
    });
  }

  /**
   * Convert static QRIS to dynamic QRIS image file
   * @param qrisCode Static QRIS code
   * @param nominal Amount in Rupiah
   * @param options Additional options (taxtype, fee, path, base64)
   * @returns Path to the generated file or base64 string if base64 option is true
   */
  static makeDynamicFile(
    qrisCode: string,
    nominal: string,
    options?: {
      taxtype?: 'r' | 'p';
      fee?: string;
      path?: string;
      base64?: boolean;
    },
  ): string {
    // If path is not provided, use default path
    if (!options?.path) {
      const outputDir = join(process.cwd(), 'public', 'qris-output');
      
      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const fileName = `qris-${Date.now()}.jpg`;
      options = { ...options, path: join(outputDir, fileName) };
    }

    const result = qrisDinamis.makeFile(qrisCode, {
      nominal: parseInt(nominal).toString(),
      taxtype: options?.taxtype || this.DEFAULT_TAX_TYPE,
      fee: options?.fee || this.DEFAULT_FEE,
      path: options?.path,
      base64: options?.base64,
    });

          // If base64 is true, return the base64 string
    // Otherwise return the relative path to the file
    if (options?.base64) {
      return result;
    } else {
      // Convert absolute path to relative URL path
      // At this point options.path is guaranteed to exist since we set it above if it wasn't provided
      return options.path!.replace(join(process.cwd(), 'public'), '');
    }
  }


} 