export interface Client {
  id: string;
  consumerName: string;
  phone: string;
  altPhone: string;
  address: string;
  blockOrTowerType: 'Block' | 'Tower';
  blockOrTowerNumber: string;
  flatNumber: string;
  pincode: string;
  amcAmount: number;
  amcEntryDate: string;
  amcExpiryDate: string;
  unitModel: string;
  installationPlace: 'Home' | 'Office' | '';
  servicingDates: string[];
  paymentMethod: 'Cash' | 'Online' | 'Check' | '';
}
