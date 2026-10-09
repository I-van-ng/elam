export const hcegExams = [
  { name: 'NFS', withCnamgs: 1500, withoutCnamgs: 7500 },
  { name: 'Glycémie à jeun', withCnamgs: 375, withoutCnamgs: 1875 },
  { name: 'BW', withCnamgs: 1500, withoutCnamgs: 7500 },
  { name: 'Hépatite B', withCnamgs: 2000, withoutCnamgs: 10000 },
  { name: 'Hépatite C', withCnamgs: 3750, withoutCnamgs: 18750 },
  { name: 'SRV', withCnamgs: 3000, withoutCnamgs: 15000 },
  { name: 'Spermogramme', withCnamgs: null, withoutCnamgs: 10000 },
  { name: 'Spermoculture', withCnamgs: null, withoutCnamgs: 10000 },
];

export const hcegExamsSchedule = 'Du lundi au samedi, de 8h à 15h';

export const hcegChildVaccines = [
  { vaccine: 'B.C.G', disease: 'Tuberculose', age: 'À la naissance' },
  { vaccine: 'V.P.O', disease: 'Poliomyélite', age: 'À la naissance' },
  { vaccine: 'Penta 1 (DTC-Hep B-HiB) + VPO 1', disease: 'Diphtérie, tétanos, coqueluche, hépatite B, certaines méningites et pneumonies, poliomyélite', age: '6 semaines (1 mois 1/2)' },
  { vaccine: 'Penta 2 (DTC-Hep B-HiB) + VPO 2', disease: 'Diphtérie, tétanos, coqueluche, hépatite B, certaines méningites et pneumonies, poliomyélite', age: '10 semaines (2 mois 1/2)' },
  { vaccine: 'Penta 3 (DTC-Hep B-HiB) + VPO 3', disease: 'Diphtérie, tétanos, coqueluche, hépatite B, certaines méningites et pneumonies, poliomyélite', age: '14 semaines (3 mois 1/2)' },
  { vaccine: 'V.A.R', disease: 'Rougeole', age: '9 mois' },
  { vaccine: 'V.A.A', disease: 'Fièvre jaune', age: '9 mois' },
];

export const hcegPregnancyVaccines = [
  { dose: 'V.A.T.1', minDate: '1er contact', protection: 'Aucune protection' },
  { dose: 'V.A.T.2', minDate: '1 mois après V.A.T.1', protection: '3 ans' },
  { dose: 'V.A.T.3', minDate: '6 mois après V.A.T.2', protection: '5 ans' },
  { dose: 'V.A.T.4', minDate: '1 an après V.A.T.3', protection: '10 ans' },
  { dose: 'V.A.T.5', minDate: '1 an après V.A.T.4', protection: 'Toute la période de fécondité' },
];

export const hcegVaccinesNote =
  'Tous les vaccins sont gratuits. La vaccination de la femme enceinte protège l’enfant et sa maman contre le tétanos.';