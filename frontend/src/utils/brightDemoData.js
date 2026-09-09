/**
 * brightDemoData.js — Frontend Bright Connection Tally demo data generator
 * Derived strictly from backend-nodejs/src/scripts/demoData.js (Mumbai Dealers Master)
 */

export const DEMO_DEALERS = [
  {
    id: 'store_bright_mumbai_01',
    code: 'BC-MUM-001',
    name: 'Andheri Electronics Hub',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Andheri West',
    address: 'Shop 12, SV Road, Andheri West, Mumbai 400058',
    geofence: { lat: 19.1197, lng: 72.8464, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent - Mumbai Region)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 345000,
    overdue: 85000,
    phone: '9820123456',
    gstin: '27AABCA1234F1Z5',
    pan: 'AABCA1234F',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '1 minute ago',
  },
  {
    id: 'store_bright_mumbai_02',
    code: 'BC-MUM-002',
    name: 'Bandra Trading Co',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Bandra East',
    address: 'Plot 45, BKC Main Road, Bandra East, Mumbai 400051',
    geofence: { lat: 19.0596, lng: 72.8402, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 278000,
    overdue: 0,
    phone: '9820234567',
    gstin: '27AABCB5678G1Z3',
    pan: 'AABCB5678G',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '5 minutes ago',
  },
  {
    id: 'store_bright_mumbai_03',
    code: 'BC-MUM-003',
    name: 'Churchgate Stationers',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Churchgate',
    address: 'Station Road, Opposite Railway Terminus, Churchgate, Mumbai 400020',
    geofence: { lat: 18.9322, lng: 72.8264, radiusMeters: 50 },
    manager: 'Deepak Gupta (Sales Manager)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 412000,
    overdue: 95000,
    phone: '9820345678',
    gstin: '27AABCC9012H1Z1',
    pan: 'AABCC9012H',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '3 minutes ago',
  },
  {
    id: 'store_bright_mumbai_04',
    code: 'BC-MUM-004',
    name: 'Dadar Hardware Mart',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Dadar West',
    address: 'Ranade Road, Near Station, Dadar West, Mumbai 400028',
    geofence: { lat: 19.0178, lng: 72.8478, radiusMeters: 50 },
    manager: 'Deepak Gupta (Sales Manager)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 189000,
    overdue: 42000,
    phone: '9820456789',
    gstin: '27AABCD3456J1Z8',
    pan: 'AABCD3456J',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: 'Just now',
  },
  {
    id: 'store_bright_mumbai_05',
    code: 'BC-MUM-005',
    name: 'Fort Financial Services',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Fort',
    address: 'Flora Fountain Chambers, Fort, Mumbai 400001',
    geofence: { lat: 18.9345, lng: 72.8356, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 600000,
    outstanding: 556000,
    overdue: 120000,
    phone: '9820567890',
    gstin: '27AABCE7890K1Z6',
    pan: 'AABCE7890K',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '4 minutes ago',
  },
  {
    id: 'store_bright_mumbai_06',
    code: 'BC-MUM-006',
    name: 'Juhu Retail Paradise',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Juhu',
    address: 'Juhu Tara Road, Juhu, Mumbai 400049',
    geofence: { lat: 19.1075, lng: 72.8263, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 167000,
    overdue: 35000,
    phone: '9820678901',
    gstin: '27AABCF2345L1Z4',
    pan: 'AABCF2345L',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '2 minutes ago',
  },
  {
    id: 'store_bright_mumbai_07',
    code: 'BC-MUM-007',
    name: 'Kurla Wholesale Depot',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Kurla West',
    address: 'LBS Marg, Kurla West, Mumbai 400070',
    geofence: { lat: 19.0728, lng: 72.8826, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 398000,
    overdue: 60000,
    phone: '9820789012',
    gstin: '27AABCG6789M1Z2',
    pan: 'AABCG6789M',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '6 minutes ago',
  },
  {
    id: 'store_bright_mumbai_08',
    code: 'BC-MUM-008',
    name: 'Lower Parel Office Solutions',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Lower Parel',
    address: 'Senapati Bapat Marg, Lower Parel, Mumbai 400013',
    geofence: { lat: 19.0003, lng: 72.8312, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 234000,
    overdue: 0,
    phone: '9820890123',
    gstin: '27AABCH0123N1Z0',
    pan: 'AABCH0123N',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '10 minutes ago',
  },
  {
    id: 'store_bright_mumbai_09',
    code: 'BC-MUM-009',
    name: 'Malad Stationery World',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Malad West',
    address: 'Link Road, Malad West, Mumbai 400064',
    geofence: { lat: 19.1874, lng: 72.8484, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 145000,
    overdue: 25000,
    phone: '9820901234',
    gstin: '27AABCI4567P1Z8',
    pan: 'AABCI4567P',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '8 minutes ago',
  },
  {
    id: 'store_bright_mumbai_10',
    code: 'BC-MUM-010',
    name: 'Powai Tech Supplies',
    company: 'Bright Connections - (from 1-Apr-24)',
    tenantId: 'tenant_bright_connection',
    city: 'Mumbai',
    region: 'Maharashtra',
    area: 'Powai',
    address: 'Hiranandani Gardens, Powai, Mumbai 400076',
    geofence: { lat: 19.1176, lng: 72.9060, radiusMeters: 50 },
    manager: 'Rajesh Menon (Field Agent)',
    owner: 'Deepak Gupta / Sales Manager',
    creditLimit: 500000,
    outstanding: 312000,
    overdue: 40000,
    phone: '9820012345',
    gstin: '27AABCJ8901Q1Z6',
    pan: 'AABCJ8901Q',
    group: 'Sundry Debtors',
    tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
    tallyLastSync: '3 minutes ago',
  },
];

const VOUCHER_TYPES = ['Sale', 'Receipt', 'Sale', 'Payment'];
const NARRATIONS = [
  'Consumer Electronics & Wiring Kits - Mumbai Depot',
  'Smart Switches & Modular Boxes',
  'HDFC Bank Mumbai RTGS Payment',
  'Heavy Duty Distribution Boards',
  'GST Tax Invoice Payment',
  'Bulk Hardware Order Settlement',
  'Modular Switches & Cable Roll',
  'Direct Bank RTGS Account Transfer - Bandra Branch',
];

function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) / 1000) * 1000;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export function generateDemoVouchersForStore(storeCode) {
  const now = new Date();
  const vouchers = [];
  
  // Seed transactions matching Mumbai Ledger
  const baseTransactions = [
    { date: '2026-09-06', type: 'Sale', number: `INV-${storeCode}-089`, narration: 'Consumer Electronics & Wiring Kits - Mumbai Depot', amount: 85000, status: 'Cleared' },
    { date: '2026-08-28', type: 'Sale', number: `ORD-${storeCode}-074`, narration: 'Smart Switches & Modular Boxes', amount: 160000, status: 'In Payment Window' },
    { date: '2026-08-15', type: 'Receipt', number: `REC-${storeCode}-041`, narration: 'HDFC Bank Mumbai RTGS Payment', amount: 75000, status: 'Completed' },
    { date: '2026-08-01', type: 'Sale', number: `INV-${storeCode}-061`, narration: 'Heavy Duty Distribution Boards', amount: 75000, status: 'Cleared' },
  ];

  vouchers.push(...baseTransactions);

  // Generate 6 additional dynamic vouchers from script generator
  let voucherNum = 100;
  for (let i = 5; i <= 10; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 4));
    const type = VOUCHER_TYPES[i % VOUCHER_TYPES.length];
    const amount = randomAmount(25000, 140000);
    const prefix = type === 'Sale' ? 'INV' : type === 'Receipt' ? 'REC' : 'PAY';

    vouchers.push({
      date: formatDate(d),
      type,
      number: `${prefix}-${storeCode}-${String(++voucherNum).padStart(3, '0')}`,
      narration: NARRATIONS[i % NARRATIONS.length],
      amount,
      status: type === 'Receipt' ? 'Completed' : 'Cleared',
    });
  }

  // Sort by date descending
  return vouchers.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function generateDemoParties() {
  return DEMO_DEALERS;
}

