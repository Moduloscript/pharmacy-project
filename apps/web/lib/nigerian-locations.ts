// Nigerian States
export const nigerianStates = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT (Abuja)',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara'
]

// Sample LGAs for major states (add more as needed)
export const stateLGAMapping: Record<string, string[]> = {
  'Lagos': [
    'Agege',
    'Ajeromi-Ifelodun',
    'Alimosho',
    'Amuwo-Odofin',
    'Apapa',
    'Badagry',
    'Epe',
    'Eti-Osa',
    'Ibeju-Lekki',
    'Ifako-Ijaiye',
    'Ikeja',
    'Ikorodu',
    'Kosofe',
    'Lagos Island',
    'Lagos Mainland',
    'Mushin',
    'Ojo',
    'Oshodi-Isolo',
    'Shomolu',
    'Surulere'
  ],
  'FCT (Abuja)': [
    'Abaji',
    'Abuja Municipal',
    'Bwari',
    'Gwagwalada',
    'Kuje',
    'Kwali'
  ],
  'Kano': [
    'Ajingi',
    'Albasu',
    'Bagwai',
    'Bebeji',
    'Bichi',
    'Bunkure',
    'Dala',
    'Dambatta',
    'Dawakin Kudu',
    'Dawakin Tofa',
    'Doguwa',
    'Fagge',
    'Gabasawa',
    'Garko',
    'Garun Mallam',
    'Gaya',
    'Gezawa',
    'Gwale',
    'Gwarzo',
    'Kabo',
    'Kano Municipal',
    'Karaye',
    'Kibiya',
    'Kiru',
    'Kumbotso',
    'Kunchi',
    'Kura',
    'Madobi',
    'Makoda',
    'Minjibir',
    'Nasarawa',
    'Rano',
    'Rimin Gado',
    'Rogo',
    'Shanono',
    'Sumaila',
    'Takai',
    'Tarauni',
    'Tofa',
    'Tsanyawa',
    'Tudun Wada',
    'Ungogo',
    'Warawa',
    'Wudil'
  ],
  'Rivers': [
    'Abua/Odual',
    'Ahoada East',
    'Ahoada West',
    'Akuku-Toru',
    'Andoni',
    'Asari-Toru',
    'Bonny',
    'Degema',
    'Eleme',
    'Emuoha',
    'Etche',
    'Gokana',
    'Ikwerre',
    'Khana',
    'Obio/Akpor',
    'Ogba/Egbema/Ndoni',
    'Ogu/Bolo',
    'Okrika',
    'Omuma',
    'Opobo/Nkoro',
    'Oyigbo',
    'Port Harcourt',
    'Tai'
  ],
  'Ogun': [
    'Abeokuta North',
    'Abeokuta South',
    'Ado-Odo/Ota',
    'Egbado North',
    'Egbado South',
    'Ewekoro',
    'Ifo',
    'Ijebu East',
    'Ijebu North',
    'Ijebu North East',
    'Ijebu Ode',
    'Ikenne',
    'Imeko Afon',
    'Ipokia',
    'Obafemi Owode',
    'Odeda',
    'Odogbolu',
    'Ogun Waterside',
    'Remo North',
    'Sagamu'
  ]
}

// Get LGAs for a specific state
export function getLGAs(state: string): string[] {
  return stateLGAMapping[state] || []
}

// Format Nigerian Naira currency
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

// Validate Nigerian phone number
export function validateNigerianPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Check for valid Nigerian phone patterns
  // +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX
  const patterns = [
    /^234[7-9][01]\d{8}$/, // 234 + mobile number
    /^0[7-9][01]\d{8}$/, // 0 + mobile number  
    /^[7-9][01]\d{8}$/ // mobile number without prefix
  ]
  
  return patterns.some(pattern => pattern.test(cleaned))
}

// Format Nigerian phone number
export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  // Add +234 prefix if not present
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`
  } else if (cleaned.startsWith('0')) {
    return `+234${cleaned.substring(1)}`
  } else if (cleaned.length === 10) {
    return `+234${cleaned}`
  }
  
  return phone // Return original if can't format
}
