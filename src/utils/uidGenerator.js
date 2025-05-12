export const generateUID = (prefix) => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomStr}`;
};

export const PREFIXES = {
  SEGREGATION: 'SEG',
  FACILITY: 'FAC',
  TRANSPORT: 'TRN',
  DISPOSAL: 'DSP'
};
