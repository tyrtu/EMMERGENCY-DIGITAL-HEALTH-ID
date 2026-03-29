// Emergency Utilities for Critical Patient Information

// Critical conditions that require immediate alerts
export const CRITICAL_CONDITIONS = {
  hemophilia: { severity: 'critical', icon: '🩸', color: '#dc2626' },
  heartCondition: { severity: 'critical', icon: '❤️', color: '#dc2626' },
  diabetes: { severity: 'critical', icon: '💉', color: '#d97706' },
  epilepsy: { severity: 'critical', icon: '⚡', color: '#dc2626' },
  severeAsthma: { severity: 'critical', icon: '🌬️', color: '#dc2626' },
  bloodDisorder: { severity: 'critical', icon: '🩸', color: '#dc2626' },
  organTransplant: { severity: 'critical', icon: '🫀', color: '#dc2626' },
  pacemaker: { severity: 'critical', icon: '⚡', color: '#dc2626' }
};

// Severe allergies that require alerts
export const SEVERE_ALLERGIES = [
  'penicillin', 'latex', 'peanut', 'shellfish', 'bee sting', 
  'aspirin', 'iodine', 'contrast dye', 'sulfa', 'morphine'
];

// Emergency protocols based on conditions
export const EMERGENCY_PROTOCOLS = {
  diabetes: {
    title: 'Diabetes Protocol',
    steps: [
      'Check blood sugar immediately',
      'If unconscious, check for diabetic emergency',
      'Administer glucose if low blood sugar',
      'Monitor vital signs closely',
      'Contact endocrinologist if available'
    ],
    icon: '💉',
    color: '#d97706'
  },
  hemophilia: {
    title: 'Hemophilia Protocol',
    steps: [
      'AVOID unnecessary injections or IVs',
      'Apply pressure to any bleeding sites',
      'Contact hematology specialist immediately',
      'Prepare for possible blood transfusion',
      'Monitor for internal bleeding'
    ],
    icon: '🩸',
    color: '#dc2626'
  },
  epilepsy: {
    title: 'Seizure Protocol',
    steps: [
      'Protect patient from injury',
      'Do NOT restrain patient',
      'Clear area around patient',
      'Time the seizure duration',
      'After seizure: place in recovery position',
      'Contact neurologist if available'
    ],
    icon: '⚡',
    color: '#dc2626'
  },
  severeAsthma: {
    title: 'Asthma Emergency Protocol',
    steps: [
      'Administer bronchodilator immediately',
      'Provide oxygen if available',
      'Monitor respiratory rate',
      'Prepare for possible intubation',
      'Contact pulmonologist if available'
    ],
    icon: '🌬️',
    color: '#dc2626'
  },
  heartCondition: {
    title: 'Cardiac Emergency Protocol',
    steps: [
      'Monitor cardiac rhythm immediately',
      'Check for chest pain or discomfort',
      'Administer cardiac medications as indicated',
      'Prepare for possible cardiac intervention',
      'Contact cardiologist immediately'
    ],
    icon: '❤️',
    color: '#dc2626'
  },
  peanut: {
    title: 'Severe Allergy Protocol',
    steps: [
      'AVOID any medications containing allergen',
      'Administer epinephrine if available',
      'Monitor for anaphylaxis',
      'Prepare for airway management',
      'Contact allergist if available'
    ],
    icon: '⚠️',
    color: '#dc2626'
  },
  penicillin: {
    title: 'Penicillin Allergy Protocol',
    steps: [
      'AVOID all penicillin-class antibiotics',
      'Use alternative antibiotics only',
      'Monitor for allergic reactions',
      'Have epinephrine ready',
      'Document allergy clearly'
    ],
    icon: '⚠️',
    color: '#dc2626'
  }
};

// Blood compatibility matrix
export const BLOOD_COMPATIBILITY = {
  'O+': { canReceive: ['O+', 'O-'], canDonate: ['O+', 'A+', 'B+', 'AB+'], rarity: 'common' },
  'O-': { canReceive: ['O-'], canDonate: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], rarity: 'rare', universalDonor: true },
  'A+': { canReceive: ['A+', 'A-', 'O+', 'O-'], canDonate: ['A+', 'AB+'], rarity: 'common' },
  'A-': { canReceive: ['A-', 'O-'], canDonate: ['A+', 'A-', 'AB+', 'AB-'], rarity: 'uncommon' },
  'B+': { canReceive: ['B+', 'B-', 'O+', 'O-'], canDonate: ['B+', 'AB+'], rarity: 'common' },
  'B-': { canReceive: ['B-', 'O-'], canDonate: ['B+', 'B-', 'AB+', 'AB-'], rarity: 'uncommon' },
  'AB+': { canReceive: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], canDonate: ['AB+'], rarity: 'common', universalRecipient: true },
  'AB-': { canReceive: ['AB-', 'A-', 'B-', 'O-'], canDonate: ['AB+', 'AB-'], rarity: 'rare' }
};

// Drug interaction database (common critical interactions)
export const DRUG_INTERACTIONS = {
  'warfarin': {
    interactions: ['aspirin', 'ibuprofen', 'naproxen', 'heparin'],
    severity: 'critical',
    message: 'Bleeding risk - AVOID NSAIDs and other anticoagulants'
  },
  'aspirin': {
    interactions: ['warfarin', 'heparin', 'ibuprofen'],
    severity: 'high',
    message: 'Increased bleeding risk'
  },
  'metformin': {
    interactions: ['alcohol', 'contrast dye'],
    severity: 'high',
    message: 'Risk of lactic acidosis - avoid alcohol and contrast'
  },
  'ace inhibitor': {
    interactions: ['potassium supplements', 'spironolactone'],
    severity: 'high',
    message: 'Risk of hyperkalemia'
  },
  'digoxin': {
    interactions: ['verapamil', 'amiodarone'],
    severity: 'critical',
    message: 'Risk of digoxin toxicity'
  },
  'maoi': {
    interactions: ['tyramine-rich foods', 'ssri', 'stimulants'],
    severity: 'critical',
    message: 'Risk of hypertensive crisis - strict dietary restrictions'
  }
};

// Calculate priority level based on patient data
export const calculatePriority = (patientData) => {
  const { criticalAllergies = [], criticalConditions = [], currentMedications = [], bloodGroup } = patientData;
  
  let priority = 'normal';
  let alerts = [];
  
  // Check for critical conditions
  criticalConditions.forEach(condition => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('hemophilia') || conditionLower.includes('bleeding')) {
      priority = 'critical';
      alerts.push({ type: 'condition', severity: 'critical', message: 'Hemophilia/Bleeding Risk', icon: '🩸' });
    } else if (conditionLower.includes('heart') || conditionLower.includes('cardiac')) {
      priority = 'critical';
      alerts.push({ type: 'condition', severity: 'critical', message: 'Heart Condition', icon: '❤️' });
    } else if (conditionLower.includes('diabetes')) {
      priority = priority === 'normal' ? 'caution' : priority;
      alerts.push({ type: 'condition', severity: 'caution', message: 'Diabetes - Check Blood Sugar', icon: '💉' });
    } else if (conditionLower.includes('epilepsy') || conditionLower.includes('seizure')) {
      priority = 'critical';
      alerts.push({ type: 'condition', severity: 'critical', message: 'Epilepsy/Seizure Risk', icon: '⚡' });
    } else if (conditionLower.includes('asthma') && conditionLower.includes('severe')) {
      priority = 'critical';
      alerts.push({ type: 'condition', severity: 'critical', message: 'Severe Asthma', icon: '🌬️' });
    }
  });
  
  // Check for severe allergies
  criticalAllergies.forEach(allergy => {
    const allergyLower = allergy.toLowerCase();
    SEVERE_ALLERGIES.forEach(severeAllergy => {
      if (allergyLower.includes(severeAllergy)) {
        priority = priority === 'normal' ? 'caution' : 'critical';
        alerts.push({ 
          type: 'allergy', 
          severity: 'critical', 
          message: `Severe Allergy: ${allergy}`, 
          icon: '⚠️' 
        });
      }
    });
  });
  
  // Check for rare blood type
  if (bloodGroup && BLOOD_COMPATIBILITY[bloodGroup]) {
    const bloodInfo = BLOOD_COMPATIBILITY[bloodGroup];
    if (bloodInfo.rarity === 'rare') {
      alerts.push({ 
        type: 'blood', 
        severity: 'caution', 
        message: `Rare Blood Type: ${bloodGroup}`, 
        icon: '🩸' 
      });
    }
  }
  
  // Check for drug interactions
  currentMedications.forEach(med => {
    const medLower = med.toLowerCase();
    Object.keys(DRUG_INTERACTIONS).forEach(drug => {
      if (medLower.includes(drug)) {
        const interaction = DRUG_INTERACTIONS[drug];
        alerts.push({
          type: 'drug',
          severity: interaction.severity === 'critical' ? 'critical' : 'caution',
          message: interaction.message,
          icon: '💊'
        });
        if (interaction.severity === 'critical') {
          priority = 'critical';
        }
      }
    });
  });
  
  return { priority, alerts };
};

// Get blood compatibility information
export const getBloodCompatibility = (bloodGroup) => {
  if (!bloodGroup || !BLOOD_COMPATIBILITY[bloodGroup]) {
    return null;
  }
  
  const info = BLOOD_COMPATIBILITY[bloodGroup];
  return {
    bloodGroup,
    canReceive: info.canReceive,
    canDonate: info.canDonate,
    rarity: info.rarity,
    universalDonor: info.universalDonor || false,
    universalRecipient: info.universalRecipient || false,
    message: info.universalDonor 
      ? 'Universal Donor - Can donate to all blood types'
      : info.universalRecipient
      ? 'Universal Recipient - Can receive from all blood types'
      : `Can receive: ${info.canReceive.join(', ')} | Can donate to: ${info.canDonate.join(', ')}`
  };
};

// Get applicable emergency protocols
export const getApplicableProtocols = (patientData) => {
  const { criticalAllergies = [], criticalConditions = [] } = patientData;
  const protocols = [];
  
  // Check conditions
  criticalConditions.forEach(condition => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('diabetes')) {
      protocols.push(EMERGENCY_PROTOCOLS.diabetes);
    } else if (conditionLower.includes('hemophilia') || conditionLower.includes('bleeding')) {
      protocols.push(EMERGENCY_PROTOCOLS.hemophilia);
    } else if (conditionLower.includes('epilepsy') || conditionLower.includes('seizure')) {
      protocols.push(EMERGENCY_PROTOCOLS.epilepsy);
    } else if (conditionLower.includes('asthma') && conditionLower.includes('severe')) {
      protocols.push(EMERGENCY_PROTOCOLS.severeAsthma);
    } else if (conditionLower.includes('heart') || conditionLower.includes('cardiac')) {
      protocols.push(EMERGENCY_PROTOCOLS.heartCondition);
    }
  });
  
  // Check allergies
  criticalAllergies.forEach(allergy => {
    const allergyLower = allergy.toLowerCase();
    if (allergyLower.includes('peanut')) {
      protocols.push(EMERGENCY_PROTOCOLS.peanut);
    } else if (allergyLower.includes('penicillin')) {
      protocols.push(EMERGENCY_PROTOCOLS.penicillin);
    }
  });
  
  return protocols;
};

// Format phone number for tel: link
export const formatPhoneForCall = (phone) => {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
};

// Format phone number for SMS
export const formatPhoneForSMS = (phone) => {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
};

// Generate emergency contact actions
export const getEmergencyContactActions = (contact) => {
  if (!contact) return [];
  
  const actions = [];
  const phone = contact.phone || contact.p;
  
  if (phone) {
    const formattedPhone = formatPhoneForCall(phone);
    actions.push({
      type: 'call',
      label: 'Call',
      url: `tel:${formattedPhone}`,
      icon: '📞'
    });
    actions.push({
      type: 'sms',
      label: 'Send SMS',
      url: `sms:${formattedPhone}`,
      icon: '💬'
    });
  }
  
  if (contact.email) {
    actions.push({
      type: 'email',
      label: 'Email',
      url: `mailto:${contact.email}`,
      icon: '✉️'
    });
  }
  
  return actions;
};

// Play alert sound (visual/audio alert)
export const playAlertSound = (severity) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different severities
    if (severity === 'critical') {
      // Urgent beep pattern
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (severity === 'caution') {
      // Single beep
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (e) {
    // Audio not available - silent fail
    console.log('Alert:', severity);
  }
};

