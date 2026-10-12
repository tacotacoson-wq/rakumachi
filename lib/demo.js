import { calculate } from './property.js';
export const demo = () => [
  { name: 'サンプル：緑町レジデンス', price: 6500000, annualIncome: 900000, managementFee: 6000, repairReserve: 4000, address: '東京都（架空の物件）', station: '緑町駅 徒歩8分', built: '1996年3月', area: '25.4㎡' },
  { name: 'サンプル：川沿いハイツ', price: 9000000, annualIncome: 1080000, managementFee: 9000, repairReserve: 7000, address: '大阪府（架空の物件）', station: '川沿い駅 徒歩12分', built: '2001年7月', area: '31.8㎡' },
  { name: 'サンプル：費用未掲載', price: 5000000, annualIncome: 780000, managementFee: null, repairReserve: null, address: '愛知県（架空の物件）', station: '中央駅 徒歩5分', built: '1990年9月', area: '22.1㎡' },
].map(p => calculate({ ...p, surfaceYield: p.annualIncome / p.price * 100, url: null, image: null, fetchedAt: new Date().toISOString(), fields: {}, demo: true }));
