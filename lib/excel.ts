import * as XLSX from 'xlsx';
import { EmployeeData } from '@/types/employee';

const HEADERS = [
  'NOMOR',
  'NAMA',
  'NO_WA',
  'GAJI',
  'BPD',
  'BPD_KE_DR',
  'ZAKAT_PROFESI',
  'KOPERASI_MAS',
  'KOPERASI_KE_DR',
  'DANA_KORPRI',
  'KESETIAKAWANAN',
  'DWP_IURAN_ANGGOTA',
  'DWP_ARISAN',
  'DWP_TAB_SETDA',
  'DWP_TAB_BAG_UMUM',
  'DWP_KAS_UNSUR_PIMPINAN',
  'DWP_GNOTA',
  'TAB_LEBARAN',
  'GNOTA',
  'PMI',
];

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  
  // Add some dummy data to help user understand the format
  const dummyData = [
    HEADERS,
    [
      '6',
      'RINTO AGUS SUDARMONO, S.Sos',
      '08123456789',
      '4458800',
      '1760578',
      '49 108',
      '111400',
      '105000',
      '0 0',
      '4000',
      '25000',
      '10000',
      '20000',
      '25000',
      '25000',
      '0',
      '0',
      '0',
      '0',
      '0'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(dummyData);
  
  // Auto fit columns
  ws['!cols'] = HEADERS.map(h => ({ wch: Math.max(10, h.length) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Template Slip Gaji');
  XLSX.writeFile(wb, 'Format_Data_Slip_Gaji.xlsx');
}

export function parseExcelToEmployees(file: File): Promise<EmployeeData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
          raw: false,
          defval: ''
        });

        const employees: EmployeeData[] = jsonData.map((row) => {
          let rawWa = String(row['NO_WA'] || '').trim();
          // Remove any non-digit chars
          rawWa = rawWa.replace(/\D/g, '');
          // Replace leading 0 with 62
          if (rawWa.startsWith('0')) {
            rawWa = '62' + rawWa.substring(1);
          }

          return {
          nomor: row['NOMOR'] || '',
          nama: row['NAMA'] || '',
          noWa: rawWa,
          gaji: parseFloat(row['GAJI']) || 0,
          bpd: parseFloat(row['BPD']) || 0,
          bpdKeDr: row['BPD_KE_DR'] || '',
          zakatProfesi: parseFloat(row['ZAKAT_PROFESI']) || 0,
          koperasiMas: parseFloat(row['KOPERASI_MAS']) || 0,
          koperasiKeDr: row['KOPERASI_KE_DR'] || '',
          danaKorpri: parseFloat(row['DANA_KORPRI']) || 0,
          kesetiakawanan: parseFloat(row['KESETIAKAWANAN']) || 0,
          dwpIuranAnggota: parseFloat(row['DWP_IURAN_ANGGOTA']) || 0,
          dwpArisan: parseFloat(row['DWP_ARISAN']) || 0,
          dwpTabSetda: parseFloat(row['DWP_TAB_SETDA']) || 0,
          dwpTabBagUmum: parseFloat(row['DWP_TAB_BAG_UMUM']) || 0,
          dwpKasUnsurPimpinan: parseFloat(row['DWP_KAS_UNSUR_PIMPINAN']) || 0,
          dwpGnota: parseFloat(row['DWP_GNOTA']) || 0,
          tabLebaran: parseFloat(row['TAB_LEBARAN']) || 0,
          gnota: parseFloat(row['GNOTA']) || 0,
          pmi: parseFloat(row['PMI']) || 0,
        }});

        resolve(employees.filter(e => e.nama)); // filter empty rows
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
