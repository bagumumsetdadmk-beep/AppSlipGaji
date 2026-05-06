import { EmployeeData } from '@/types/employee';

export function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return '0';
  return value.toLocaleString('id-ID'); // formats 1000 to "1.000" instead of Rp.
}

export function calculateTotalPotongan(emp: EmployeeData): number {
  return (
    emp.bpd +
    emp.zakatProfesi +
    emp.koperasiMas +
    emp.danaKorpri +
    emp.kesetiakawanan +
    emp.dwpIuranAnggota +
    emp.dwpArisan +
    emp.dwpTabSetda +
    emp.dwpTabBagUmum +
    emp.dwpKasUnsurPimpinan +
    emp.dwpGnota +
    emp.tabLebaran +
    emp.gnota +
    emp.pmi
  );
}

export function calculateSisaGaji(emp: EmployeeData): number {
  return emp.gaji - calculateTotalPotongan(emp);
}

export function generateWhatsAppLink(emp: EmployeeData, month: string, year: string): string {
  const totalPotongan = calculateTotalPotongan(emp);
  const sisaGaji = calculateSisaGaji(emp);

  // Formatter specifically for text output
  const fmt = (val: number) => formatCurrency(val);

  const lines = [
    `*RINCIAN GAJI BULAN ${month.toUpperCase()} ${year}*`,
    `*BAGIAN UMUM SETDA KAB. DEMAK*`,
    ``,
    `NOMOR : ${emp.nomor}`,
    `NAMA  : ${emp.nama}`,
    ``,
    `GAJI  : Rp ${fmt(emp.gaji)}`,
    ``,
    `*ANGSURAN, IURAN DLL :*`,
  ];

  if (emp.bpd > 0) lines.push(`B.P.D. : Rp ${fmt(emp.bpd)}${emp.bpdKeDr ? ` (KE/DR : ${emp.bpdKeDr})` : ''}`);
  if (emp.zakatProfesi > 0) lines.push(`ZAKAT PROFESI : Rp ${fmt(emp.zakatProfesi)}`);
  if (emp.koperasiMas > 0) lines.push(`KOPERASI MAS : Rp ${fmt(emp.koperasiMas)}${emp.koperasiKeDr ? ` (KE/DR : ${emp.koperasiKeDr})` : ''}`);
  if (emp.danaKorpri > 0) lines.push(`DANA KORPRI : Rp ${fmt(emp.danaKorpri)}`);
  if (emp.kesetiakawanan > 0) lines.push(`KESETIAKAWANAN : Rp ${fmt(emp.kesetiakawanan)}`);
  if (emp.dwpIuranAnggota > 0) lines.push(`DWP IURAN ANGGOTA : Rp ${fmt(emp.dwpIuranAnggota)}`);
  if (emp.dwpArisan > 0) lines.push(`DWP ARISAN : Rp ${fmt(emp.dwpArisan)}`);
  if (emp.dwpTabSetda > 0) lines.push(`DWP TAB SETDA : Rp ${fmt(emp.dwpTabSetda)}`);
  if (emp.dwpTabBagUmum > 0) lines.push(`DWP TAB BAG UMUM : Rp ${fmt(emp.dwpTabBagUmum)}`);
  if (emp.dwpKasUnsurPimpinan > 0) lines.push(`DWP KAS UNSUR PIMPINAN : Rp ${fmt(emp.dwpKasUnsurPimpinan)}`);
  if (emp.dwpGnota > 0) lines.push(`DWP GNOTA : Rp ${fmt(emp.dwpGnota)}`);
  if (emp.tabLebaran > 0) lines.push(`TAB LEBARAN (BU SITI) : Rp ${fmt(emp.tabLebaran)}`);
  if (emp.gnota > 0) lines.push(`GNOTA : Rp ${fmt(emp.gnota)}`);
  if (emp.pmi > 0) lines.push(`PMI : Rp ${fmt(emp.pmi)}`);

  lines.push(``);
  lines.push(`*JUMLAH POTONGAN* : Rp ${fmt(totalPotongan)}`);
  lines.push(``);
  lines.push(`*SISA GAJI DITERIMA* : Rp ${fmt(sisaGaji)}`);
  lines.push(``);
  lines.push(`Bendahara Gaji`);
  lines.push(`WURYANTO, S.M`);
  lines.push(`NIP 198206292008011017`);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${emp.noWa}?text=${text}`;
}
