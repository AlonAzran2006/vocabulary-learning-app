// Type definitions for vocabulary learning app

/**
 * Data types supported by the application
 */
export type DataType = "en_he" | "he_he";

/**
 * Metadata about a data type
 */
export interface DataTypeInfo {
  code: DataType;
  label: string;
  description: string;
  sourceLanguage: "en" | "he";
  targetLanguage: "he";
}

/**
 * Data type information mapping
 */
export const DATA_TYPE_INFO: Record<DataType, DataTypeInfo> = {
  en_he: {
    code: "en_he",
    label: "אנגלית",
    description: "מילים באנגלית עם פירושים בעברית",
    sourceLanguage: "en",
    targetLanguage: "he",
  },
  he_he: {
    code: "he_he",
    label: "עברית",
    description: "מילים בעברית עם פירושים בעברית",
    sourceLanguage: "he",
    targetLanguage: "he",
  },
};

/**
 * Get data type info
 */
export function getDataTypeInfo(dataType: DataType): DataTypeInfo {
  return DATA_TYPE_INFO[dataType];
}

/**
 * Get all available data types
 */
export function getAllDataTypes(): DataTypeInfo[] {
  return Object.values(DATA_TYPE_INFO);
}

/**
 * Default data type (backward compatibility)
 */
export const DEFAULT_DATA_TYPE: DataType = "en_he";

