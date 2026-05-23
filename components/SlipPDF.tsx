import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { EmployeeData } from '@/types/employee';
import { calculateTotalPotongan, calculateSisaGaji, formatCurrency } from '@/lib/format';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b' // slate-800
  },
  header: {
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 20,
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94a3b8'
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4
  },
  label: {
    width: 80,
    fontWeight: 'bold',
    color: '#64748b'
  },
  colon: {
    width: 10,
    color: '#94a3b8'
  },
  value: {
    fontWeight: 'bold',
  },
  gajiPokok: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 16
  },
  potonganTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8
  },
  potonganGrid: {
    flexDirection: 'column',
  },
  potonganRow: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 9,
    color: '#475569'
  },
  pLabel: {
    width: 140,
  },
  pColon: {
    width: 10,
  },
  pValue: {
    width: 70,
    textAlign: 'right'
  },
  pNote: {
    marginLeft: 20,
  },
  totalPotongan: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 12,
    marginBottom: 20
  },
  sisaBox: {
    backgroundColor: '#10b981', // emerald-500
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  sisaText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  sisaValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  signature: {
    alignItems: 'flex-end',
    marginTop: 20
  },
  sigBox: {
    alignItems: 'center'
  },
  sigText: {
    fontSize: 9,
    marginBottom: 10
  },
  qrCode: {
    width: 64,
    height: 64,
    marginBottom: 10
  },
  sigName: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 2
  },
  sigNip: {
    fontSize: 8,
    color: '#94a3b8'
  }
});

interface SlipPDFProps {
  employee: EmployeeData;
  month: string;
  year: string;
  qrCodeDataUrl: string;
}

export const SlipPDFDocument = ({ employee: emp, month, year, qrCodeDataUrl }: SlipPDFProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RINCIAN GAJI BULAN {month.toUpperCase()} {year}</Text>
          <Text style={styles.headerSubtitle}>BAGIAN UMUM SETDA KAB. DEMAK</Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>NOMOR</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{emp.nomor}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NAMA</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.value}>{emp.nama}</Text>
          </View>
        </View>

        <View style={styles.gajiPokok}>
          <Text style={{ fontWeight: 'bold', color: '#64748b' }}>GAJI POKOK</Text>
          <Text style={{ fontWeight: 'bold' }}>{formatCurrency(emp.gaji)}</Text>
        </View>

        <Text style={styles.potonganTitle}>POTONGAN / ANGSURAN IURAN :</Text>

        <View style={styles.potonganGrid}>
          <PotonganRow label="B.P.D." value={emp.bpd} note={emp.bpdKeDr} show={true} />
          <PotonganRow label="ZAKAT PROFESI" value={emp.zakatProfesi} show={true} />
          <PotonganRow label="KOPERASI MAS" value={emp.koperasiMas} note={emp.koperasiKeDr} show={true} />
          <PotonganRow label="DANA KORPRI" value={emp.danaKorpri} show={true} />
          <PotonganRow label="KESETIAKAWANAN" value={emp.kesetiakawanan} show={true} />
          <PotonganRow label="DWP IURAN ANGGOTA" value={emp.dwpIuranAnggota} show={true} />
          <PotonganRow label="DWP ARISAN" value={emp.dwpArisan} show={true} />
          <PotonganRow label="DWP TAB SETDA" value={emp.dwpTabSetda} show={true} />
          <PotonganRow label="DWP TAB BAG UMUM" value={emp.dwpTabBagUmum} show={true} />
          <PotonganRow label="DWP KAS UNSUR PIMPINAN" value={emp.dwpKasUnsurPimpinan} show={true} />
          <PotonganRow label="DWP GNOTA" value={emp.dwpGnota} show={true} />
          <PotonganRow label="TAB LEBARAN (BU SITI)" value={emp.tabLebaran} show={true} />
          <PotonganRow label="GNOTA" value={emp.gnota} show={true} />
          <PotonganRow label="PMI" value={emp.pmi} show={true} />
        </View>

        <View style={styles.totalPotongan}>
          <Text style={{ fontWeight: 'bold', color: '#64748b' }}>JUMLAH POTONGAN</Text>
          <Text style={{ fontWeight: 'bold' }}>{formatCurrency(calculateTotalPotongan(emp))}</Text>
        </View>

        <View style={styles.sisaBox}>
          <Text style={styles.sisaText}>SISA BERSIH DITERIMA</Text>
          <Text style={styles.sisaValue}>{formatCurrency(calculateSisaGaji(emp))}</Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.sigBox}>
            <Text style={styles.sigText}>Bendahara Gaji</Text>
            {qrCodeDataUrl ? <Image src={qrCodeDataUrl} style={styles.qrCode} /> : <View style={styles.qrCode} />}
            <Text style={styles.sigName}>WURYANTO, S.M</Text>
            <Text style={styles.sigNip}>NIP 198206292008011017</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

const PotonganRow = ({ label, value, note, show }: { label: string, value: number, note?: string, show: boolean }) => {
  if (!show) return null;
  return (
    <View style={styles.potonganRow}>
      <Text style={styles.pLabel}>{label}</Text>
      <Text style={styles.pColon}>:</Text>
      <Text style={styles.pValue}>{value === 0 ? '-' : formatCurrency(value)}</Text>
      {note && <Text style={styles.pNote}>KE/DR : {note}</Text>}
    </View>
  );
};
